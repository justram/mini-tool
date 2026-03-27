import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import process from "node:process";
import { chromium } from "@playwright/test";

type Variant = "mini" | "source";
type RuntimeProfile = "default" | "quiet";

type Args = {
  component: string;
  variant: Variant;
  profile: RuntimeProfile;
  runs: number;
  warmup: number;
  iterations: number;
  port?: number;
};

type Sample = {
  defineReadyMs: number;
  mountWorkAvgMs: number;
  mountFrameAvgMs: number;
  mountTotalAvgMs: number;
  updateWorkAvgMs: number;
  updateFrameAvgMs: number;
  updateTotalAvgMs: number;
};

type RuntimeResult = {
  timestamp: string;
  benchmarkTool: "playwright-runtime";
  variant: Variant;
  component: string;
  methodology: {
    url: string;
    profile: RuntimeProfile;
    runs: number;
    warmup: number;
    iterationsPerRun: number;
    notes: string[];
  };
  metrics: {
    defineReadyMs: Stats;
    mountWorkAvgMs: Stats;
    mountFrameAvgMs: Stats;
    mountTotalAvgMs: Stats;
    updateWorkAvgMs: Stats;
    updateFrameAvgMs: Stats;
    updateTotalAvgMs: Stats;
  };
  samples: Sample[];
};

type Stats = {
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
};

const RUNTIME_COMPONENTS = [
  "approval-card",
  "audio",
  "video",
  "chart",
  "citation",
  "citation-list",
  "code-block",
  "code-diff",
  "image",
  "image-gallery",
  "geo-map",
  "instagram-post",
  "linkedin-post",
  "link-preview",
  "message-draft",
  "option-list",
  "order-summary",
  "parameter-slider",
  "plan",
  "preferences-panel",
  "progress-tracker",
  "stats-display",
  "terminal",
  "x-post",
] as const;

type RuntimeComponent = (typeof RUNTIME_COMPONENTS)[number];

const RUNTIME_COMPONENT_SET = new Set<string>(RUNTIME_COMPONENTS);
const MINI_BASELINE_COMPONENT_SET = new Set<string>(RUNTIME_COMPONENTS);

function isRuntimeComponent(component: string): component is RuntimeComponent {
  return RUNTIME_COMPONENT_SET.has(component);
}

function isMiniBaselineComponent(component: string): boolean {
  return MINI_BASELINE_COMPONENT_SET.has(component);
}

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }

    map.set(token.slice(2), value);
    index += 1;
  }

  const component = map.get("component") ?? "link-preview";
  const variant = (map.get("variant") ?? "mini") as Variant;
  const profile = (map.get("profile") ?? "quiet") as RuntimeProfile;
  const defaults =
    profile === "quiet"
      ? {
          runs: 20,
          warmup: 5,
          iterations: 120,
        }
      : {
          runs: 12,
          warmup: 3,
          iterations: 80,
        };
  const runs = Number(map.get("runs") ?? String(defaults.runs));
  const warmup = Number(map.get("warmup") ?? String(defaults.warmup));
  const iterations = Number(map.get("iterations") ?? String(defaults.iterations));
  const portRaw = map.get("port");
  const port = portRaw ? Number(portRaw) : undefined;

  if (variant !== "mini" && variant !== "source") {
    throw new Error("--variant must be either 'mini' or 'source'.");
  }

  if (profile !== "default" && profile !== "quiet") {
    throw new Error("--profile must be one of: default, quiet.");
  }

  if (!isRuntimeComponent(component)) {
    throw new Error(
      `Unsupported ${variant} runtime component '${component}'. Supported: ${RUNTIME_COMPONENTS.join(", ")}.`,
    );
  }

  if (!Number.isFinite(runs) || runs < 3) {
    throw new Error("--runs must be >= 3.");
  }

  if (!Number.isFinite(warmup) || warmup < 0) {
    throw new Error("--warmup must be >= 0.");
  }

  if (!Number.isFinite(iterations) || iterations < 5) {
    throw new Error("--iterations must be >= 5.");
  }

  if (port !== undefined && (!Number.isFinite(port) || port <= 0)) {
    throw new Error("--port must be a positive number.");
  }

  return {
    component,
    variant,
    profile,
    runs,
    warmup,
    iterations,
    port,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(index, 0)];
}

function toStats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);

  return {
    mean: sum / sorted.length,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

function average(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until timeout.
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(`Timed out waiting for server at ${url}`);
}

async function findAvailablePort(startPort: number, maxAttempts = 30): Promise<number> {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;

    const isAvailable = await new Promise<boolean>((resolveAvailability) => {
      const server = createServer();
      server.once("error", () => resolveAvailability(false));
      server.listen(candidate, "127.0.0.1", () => {
        server.close(() => resolveAvailability(true));
      });
    });

    if (isAvailable) {
      return candidate;
    }
  }

  throw new Error(`Could not find available port from ${startPort}..${startPort + maxAttempts - 1}`);
}

function startViteServer(configPath: string, port: number): { stop: () => Promise<void> } {
  const child = spawn("npx", ["vite", "--config", configPath, "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  return {
    stop: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      await new Promise<void>((resolveExit) => {
        child.once("exit", () => resolveExit());
      });
    },
  };
}

async function runMiniSmokeSample(
  url: string,
  component: string,
  payload: unknown,
  iterations: number,
): Promise<Sample> {
  const tagName = `mini-tool-${component}`;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });

    const scriptBody = `
      return (async (input) => {
        const { tagNameArg, payloadArg, iterationsArg } = input;
        const payloadClone = () => JSON.parse(JSON.stringify(payloadArg));

        const defineReadyStart = performance.now();
        await customElements.whenDefined(tagNameArg);
        const defineReadyMs = performance.now() - defineReadyStart;

        const host = document.createElement("div");
        host.setAttribute("data-benchmark-host", tagNameArg);
        document.body.append(host);

        const measureMount = async () => {
          const startedAt = performance.now();
          const element = document.createElement(tagNameArg);
          element.payload = payloadClone();
          host.append(element);
          await element.updateComplete;
          const endedAt = performance.now();
          element.remove();
          return endedAt - startedAt;
        };

        const measureUpdate = async () => {
          const element = document.createElement(tagNameArg);
          element.payload = payloadClone();
          host.append(element);
          await element.updateComplete;

          const updatedPayload = payloadClone();
          if (updatedPayload && typeof updatedPayload === "object" && "id" in updatedPayload) {
            const id = updatedPayload.id;
            if (typeof id === "string") {
              updatedPayload.id = String(id) + "-updated";
            }
          }

          const startedAt = performance.now();
          element.payload = updatedPayload;
          await element.updateComplete;
          const endedAt = performance.now();
          element.remove();
          return endedAt - startedAt;
        };

        const mountRuns = [];
        const updateRuns = [];

        for (let index = 0; index < iterationsArg; index += 1) {
          mountRuns.push(await measureMount());
        }

        for (let index = 0; index < iterationsArg; index += 1) {
          updateRuns.push(await measureUpdate());
        }

        host.remove();

        const mountTotalAvgMs = mountRuns.reduce((acc, value) => acc + value, 0) / mountRuns.length;
        const updateTotalAvgMs = updateRuns.reduce((acc, value) => acc + value, 0) / updateRuns.length;

        return {
          defineReadyMs,
          mountWorkAvgMs: mountTotalAvgMs,
          mountFrameAvgMs: 0,
          mountTotalAvgMs,
          updateWorkAvgMs: updateTotalAvgMs,
          updateFrameAvgMs: 0,
          updateTotalAvgMs,
        };
      })(input);
    `;

    return await page.evaluate(
      ({ body, input }) => {
        const runner = new Function("input", body);
        return runner(input);
      },
      {
        body: scriptBody,
        input: {
          tagNameArg: tagName,
          payloadArg: payload,
          iterationsArg: iterations,
        },
      },
    );
  } finally {
    await browser.close();
  }
}

async function runMiniBaselineSample(
  url: string,
  component: string,
  payload: unknown,
  iterations: number,
): Promise<Sample> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForFunction(
      () => typeof (window as { __miniRuntimeBenchmark?: unknown }).__miniRuntimeBenchmark === "function",
      undefined,
      { timeout: 20_000 },
    );

    return await page.evaluate(
      async ({ componentArg, payloadArg, iterationsArg }) => {
        const runner = (window as { __miniRuntimeBenchmark?: unknown }).__miniRuntimeBenchmark;
        if (typeof runner !== "function") {
          throw new Error("mini runtime harness is missing window.__miniRuntimeBenchmark");
        }

        return runner({
          component: componentArg,
          payload: payloadArg,
          iterations: iterationsArg,
        });
      },
      {
        componentArg: component,
        payloadArg: payload,
        iterationsArg: iterations,
      },
    );
  } finally {
    await browser.close();
  }
}

async function runSourceSample(url: string, component: string, payload: unknown, iterations: number): Promise<Sample> {
  const browser = await chromium.launch({ headless: true });

  const isRecoverableEvaluateError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message;
    return (
      message.includes("Execution context was destroyed") ||
      message.includes("Target page, context or browser has been closed")
    );
  };

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const page = await browser.newPage();

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.waitForFunction(
          () => typeof (window as { __sourceRuntimeBenchmark?: unknown }).__sourceRuntimeBenchmark === "function",
          undefined,
          { timeout: 20_000 },
        );

        return await page.evaluate(
          async ({ componentArg, payloadArg, iterationsArg }) => {
            const runner = (window as { __sourceRuntimeBenchmark?: unknown }).__sourceRuntimeBenchmark;
            if (typeof runner !== "function") {
              throw new Error("source runtime harness is missing window.__sourceRuntimeBenchmark");
            }

            return runner({
              component: componentArg,
              payload: payloadArg,
              iterations: iterationsArg,
            });
          },
          {
            componentArg: component,
            payloadArg: payload,
            iterationsArg: iterations,
          },
        );
      } catch (error) {
        if (!isRecoverableEvaluateError(error) || attempt === 2) {
          throw error;
        }
      } finally {
        await page.close().catch(() => undefined);
      }
    }

    throw new Error("source runtime benchmark failed after recovery retries");
  } finally {
    await browser.close();
  }
}

async function runSample(args: Args, url: string, payload: unknown): Promise<Sample> {
  if (args.variant === "source") {
    return runSourceSample(url, args.component, payload, args.iterations);
  }

  if (isMiniBaselineComponent(args.component)) {
    return runMiniBaselineSample(url, args.component, payload, args.iterations);
  }

  return runMiniSmokeSample(url, args.component, payload, args.iterations);
}

function getMethodologyNotes(variant: Variant, component: string): string[] {
  if (variant === "source") {
    return [
      "Library Setup Readiness (defineReadyMs): time to load the source component module and make it render-ready.",
      "Initial Card Paint is split into mountWorkAvgMs + mountFrameAvgMs = mountTotalAvgMs.",
      "Live Data Refresh is split into updateWorkAvgMs + updateFrameAvgMs = updateTotalAvgMs.",
      "Frame wait is scheduler-dominated; use work metrics for code-level comparisons.",
    ];
  }

  if (isMiniBaselineComponent(component)) {
    return [
      "Library Setup Readiness (defineReadyMs): time to import the mini component and register the custom element.",
      "Initial Card Paint is split into mountWorkAvgMs + mountFrameAvgMs = mountTotalAvgMs.",
      "Live Data Refresh is split into updateWorkAvgMs + updateFrameAvgMs = updateTotalAvgMs.",
      "Frame wait is scheduler-dominated; use work metrics for code-level comparisons.",
    ];
  }

  return [
    "Library Setup Readiness (defineReadyMs): time until the custom element is ready to instantiate in the host page.",
    "Initial Card Paint is split into mountWorkAvgMs + mountFrameAvgMs = mountTotalAvgMs.",
    "Live Data Refresh is split into updateWorkAvgMs + updateFrameAvgMs = updateTotalAvgMs.",
    "Frame wait is scheduler-dominated; use work metrics for code-level comparisons.",
  ];
}

function formatProgress(current: number, total: number, width = 28): string {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const filled = Math.round(ratio * width);
  return `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "n/a";
  }

  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${remSeconds}s`;
}

function formatStat(value: number): string {
  return value.toFixed(3);
}

function formatStatsRow(label: string, stats: Stats | null, metricKey: string): string {
  if (!stats) {
    return `| ${label} *(${metricKey})* | n/a | n/a | n/a | n/a | n/a |`;
  }

  return `| ${label} *(${metricKey})* | ${formatStat(stats.mean)} | ${formatStat(stats.median)} | ${formatStat(stats.p95)} | ${formatStat(stats.min)} | ${formatStat(stats.max)} |`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixturePath = resolve(process.cwd(), "benchmarks", "fixtures", `${args.component}.json`);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  const defaultPort = args.variant === "source" ? 4273 : 4173;
  const selectedPort = args.port ?? (await findAvailablePort(defaultPort));
  const url = `http://127.0.0.1:${selectedPort}`;

  const useMiniBaselineHarness = args.variant === "mini" && isMiniBaselineComponent(args.component);

  const viteConfig =
    args.variant === "source"
      ? "tests/fixtures/source-runtime-app/vite.config.ts"
      : useMiniBaselineHarness
        ? "tests/fixtures/mini-runtime-app/vite.config.ts"
        : "example/vite.config.ts";

  const server = startViteServer(viteConfig, selectedPort);

  try {
    await waitForServer(url);

    const samples: Sample[] = [];
    const totalRuns = args.warmup + args.runs;
    const startedAt = Date.now();

    for (let runIndex = 0; runIndex < totalRuns; runIndex += 1) {
      const sample = await runSample(args, url, fixture);

      if (runIndex >= args.warmup) {
        samples.push(sample);
      }

      const completed = runIndex + 1;
      const elapsedMs = Date.now() - startedAt;
      const avgPerRunMs = elapsedMs / completed;
      const etaMs = avgPerRunMs * (totalRuns - completed);
      const progress = formatProgress(completed, totalRuns);
      const phase = runIndex < args.warmup ? "warmup" : "measure";

      process.stdout.write(
        `\r[${args.variant}:${args.component}] [${progress}] ${completed}/${totalRuns} (${phase}) elapsed ${formatDuration(elapsedMs)} eta ${formatDuration(etaMs)}   `,
      );
    }

    process.stdout.write("\n");

    const defineReadyValues = samples.map((sample) => sample.defineReadyMs);
    const mountWorkValues = samples.map((sample) => sample.mountWorkAvgMs);
    const mountFrameValues = samples.map((sample) => sample.mountFrameAvgMs);
    const mountTotalValues = samples.map((sample) => sample.mountTotalAvgMs);
    const updateWorkValues = samples.map((sample) => sample.updateWorkAvgMs);
    const updateFrameValues = samples.map((sample) => sample.updateFrameAvgMs);
    const updateTotalValues = samples.map((sample) => sample.updateTotalAvgMs);

    const result: RuntimeResult = {
      timestamp: new Date().toISOString(),
      benchmarkTool: "playwright-runtime",
      variant: args.variant,
      component: args.component,
      methodology: {
        url,
        profile: args.profile,
        runs: args.runs,
        warmup: args.warmup,
        iterationsPerRun: args.iterations,
        notes: getMethodologyNotes(args.variant, args.component),
      },
      metrics: {
        defineReadyMs: toStats(defineReadyValues),
        mountWorkAvgMs: toStats(mountWorkValues),
        mountFrameAvgMs: toStats(mountFrameValues),
        mountTotalAvgMs: toStats(mountTotalValues),
        updateWorkAvgMs: toStats(updateWorkValues),
        updateFrameAvgMs: toStats(updateFrameValues),
        updateTotalAvgMs: toStats(updateTotalValues),
      },
      samples,
    };

    const outputDir = join(process.cwd(), "benchmarks", "results", "runtime");
    mkdirSync(outputDir, { recursive: true });

    const base = `runtime-${args.variant}-${args.component}-${Date.now()}`;
    const jsonPath = join(outputDir, `${base}.json`);
    const mdPath = join(outputDir, `${base}.md`);

    writeFileSync(jsonPath, JSON.stringify(result, null, 2));

    const markdown = [
      "# runtime latency breakdown",
      "",
      `- Variant: ${result.variant}`,
      `- Component: ${result.component}`,
      `- Tool: ${result.benchmarkTool}`,
      `- Profile: ${args.profile}`,
      `- Runs: ${args.runs} (warmup ${args.warmup})`,
      `- Iterations per run: ${args.iterations}`,
      "",
      "| Lifecycle checkpoint | Mean (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) |",
      "|---|---:|---:|---:|---:|---:|",
      formatStatsRow("Library Setup Readiness", result.metrics.defineReadyMs, "defineReadyMs"),
      formatStatsRow("Initial Card Paint - Work", result.metrics.mountWorkAvgMs, "mountWorkAvgMs"),
      formatStatsRow("Initial Card Paint - Frame Wait", result.metrics.mountFrameAvgMs, "mountFrameAvgMs"),
      formatStatsRow("Initial Card Paint - Total", result.metrics.mountTotalAvgMs, "mountTotalAvgMs"),
      formatStatsRow("Live Data Refresh - Work", result.metrics.updateWorkAvgMs, "updateWorkAvgMs"),
      formatStatsRow("Live Data Refresh - Frame Wait", result.metrics.updateFrameAvgMs, "updateFrameAvgMs"),
      formatStatsRow("Live Data Refresh - Total", result.metrics.updateTotalAvgMs, "updateTotalAvgMs"),
      "",
      "## Notes",
      "",
      "- Runtime numbers are browser-side lifecycle latency.",
      "- Work metrics isolate component/framework render work up to commit/update-complete.",
      "- Frame Wait metrics isolate next-frame scheduling cost (typically influenced by browser frame cadence and host runtime jitter more than component logic).",
      "- Total metrics are Work + Frame Wait for user-visible settle latency.",
      "- Interpret Work as primary implementation signal, Frame Wait as scheduling/context signal, and Total as end-user perceived latency.",
      "- For contract parse/validation latency, use `npm run benchmark:compare`.",
      "",
    ].join("\n");

    writeFileSync(mdPath, markdown);

    console.log(`Wrote runtime JSON: ${jsonPath}`);
    console.log(`Wrote runtime summary: ${mdPath}`);
  } finally {
    await server.stop();
  }
}

await main();
