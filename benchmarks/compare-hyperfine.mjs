#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NOISY_COEFFICIENT_THRESHOLD = 0.08;

const VALUE_FLAGS = new Set([
  "profile",
  "component",
  "iterations",
  "runs",
  "warmup",
  "max-retries",
  "cool-down-ms",
  "max-fail-retries",
  "fail-cool-down-ms",
  "sha",
]);

function printUsage() {
  const lines = [
    "benchmark:compare (hyperfine)",
    "",
    "Usage:",
    "  node benchmarks/compare-hyperfine.mjs [options]",
    "",
    "Options:",
    "  --profile <quiet|default>   Benchmark profile (default: quiet)",
    "  --component <name>          Component key (default: link-preview)",
    "  --iterations <number>       Iterations per benchmark process",
    "  --runs <number>             Hyperfine runs (>= 5)",
    "  --warmup <number>           Hyperfine warmup runs (>= 0)",
    "  --max-retries <number>      Retry count for noisy successful trials",
    "  --cool-down-ms <number>     Cooldown between noisy retries",
    "  --max-fail-retries <number> Retry count for execution/preflight failures",
    "  --fail-cool-down-ms <num>   Cooldown between failure retries",
    "  --sha <git-sha>             Source SHA metadata (default: unknown)",
    "  --help, -h                  Print this help and exit",
    "",
    "Examples:",
    "  node benchmarks/compare-hyperfine.mjs --component data-table --profile default",
    "  node benchmarks/compare-hyperfine.mjs --component item-carousel --max-fail-retries 2",
  ];

  console.log(lines.join("\n"));
}

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliError";
  }
}

class CommandError extends Error {
  constructor(command, args, result) {
    const commandLabel = `${command} ${args.join(" ")}`;
    const status = result.status ?? "unknown";
    const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
    const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";

    super(
      `Command failed (exit ${status}): ${commandLabel}${stderr ? `\n[stderr]\n${stderr}` : ""}${stdout ? `\n[stdout]\n${stdout}` : ""}`,
    );
    this.name = "CommandError";
    this.command = command;
    this.args = args;
    this.result = result;
  }
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { mode: "help" };
  }

  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("-")) {
      throw new CliError(`Unexpected positional argument: '${token}'. Use --help for usage.`);
    }

    if (token === "-h") {
      return { mode: "help" };
    }

    if (!token.startsWith("--")) {
      throw new CliError(`Unknown short flag: '${token}'. Use --help for usage.`);
    }

    const flag = token.slice(2);
    if (flag === "help") {
      return { mode: "help" };
    }

    if (!VALUE_FLAGS.has(flag)) {
      throw new CliError(`Unknown flag: '--${flag}'. Use --help for usage.`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("-")) {
      throw new CliError(`Missing value for '--${flag}'. Use --help for usage.`);
    }

    args.set(flag, value);
    index += 1;
  }

  const profile = args.get("profile") ?? "quiet";
  if (profile !== "default" && profile !== "quiet") {
    throw new CliError("--profile must be one of: default, quiet");
  }

  const defaults =
    profile === "quiet"
      ? {
          iterations: "700000",
          runs: "20",
          warmup: "5",
          maxRetries: "2",
          coolDownMs: "500",
          maxFailRetries: "2",
          failCoolDownMs: "1000",
        }
      : {
          iterations: "500000",
          runs: "12",
          warmup: "3",
          maxRetries: "0",
          coolDownMs: "0",
          maxFailRetries: "1",
          failCoolDownMs: "250",
        };

  const component = args.get("component") ?? "link-preview";
  const iterations = Number(args.get("iterations") ?? defaults.iterations);
  const runs = Number(args.get("runs") ?? defaults.runs);
  const warmup = Number(args.get("warmup") ?? defaults.warmup);
  const maxRetries = Number(args.get("max-retries") ?? defaults.maxRetries);
  const coolDownMs = Number(args.get("cool-down-ms") ?? defaults.coolDownMs);
  const maxFailRetries = Number(args.get("max-fail-retries") ?? defaults.maxFailRetries);
  const failCoolDownMs = Number(args.get("fail-cool-down-ms") ?? defaults.failCoolDownMs);
  const sourceSha = args.get("sha") ?? "unknown";

  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new CliError("--iterations must be a positive number.");
  }

  if (!Number.isFinite(runs) || runs < 5) {
    throw new CliError("--runs must be >= 5 to keep the sample statistically meaningful.");
  }

  if (!Number.isFinite(warmup) || warmup < 0) {
    throw new CliError("--warmup must be >= 0.");
  }

  if (!Number.isFinite(maxRetries) || maxRetries < 0) {
    throw new CliError("--max-retries must be >= 0.");
  }

  if (!Number.isFinite(coolDownMs) || coolDownMs < 0) {
    throw new CliError("--cool-down-ms must be >= 0.");
  }

  if (!Number.isFinite(maxFailRetries) || maxFailRetries < 0) {
    throw new CliError("--max-fail-retries must be >= 0.");
  }

  if (!Number.isFinite(failCoolDownMs) || failCoolDownMs < 0) {
    throw new CliError("--fail-cool-down-ms must be >= 0.");
  }

  return {
    mode: "run",
    profile,
    component,
    iterations,
    runs,
    warmup,
    maxRetries,
    coolDownMs,
    maxFailRetries,
    failCoolDownMs,
    sourceSha,
  };
}

function thresholdForMetric(metricName) {
  if (metricName.startsWith("contract.parse.")) {
    return 15;
  }

  return 20;
}

function gateStatus(diffPct, thresholdPct) {
  return diffPct > thresholdPct ? "FAIL" : "PASS";
}

function formatUs(value) {
  return `${value.toFixed(3)} µs`;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function run(command, args, stdio = "inherit") {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio,
    encoding: stdio === "inherit" ? undefined : "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new CommandError(command, args, result);
  }

  return result;
}

function coefficientOfVariation(stats) {
  if (stats.mean === 0) {
    return 0;
  }

  return stats.stddev / stats.mean;
}

function runPreflight({ component }) {
  const sharedArgs = ["tsx", "benchmarks/contract-task.ts", "--component", component, "--iterations", "1"];

  run("npx", [...sharedArgs, "--variant", "source"], "pipe");
  run("npx", [...sharedArgs, "--variant", "mini"], "pipe");
}

function runHyperfineTrial({ component, iterations, runs, warmup, tmpPath }) {
  const sourceCommand = `npx tsx benchmarks/contract-task.ts --variant source --component ${component} --iterations ${iterations}`;
  const miniCommand = `npx tsx benchmarks/contract-task.ts --variant mini --component ${component} --iterations ${iterations}`;

  run("hyperfine", [
    "--shell",
    "none",
    "--warmup",
    String(warmup),
    "--runs",
    String(runs),
    "--export-json",
    tmpPath,
    "-n",
    "source",
    sourceCommand,
    "-n",
    "mini",
    miniCommand,
  ]);

  const output = JSON.parse(readFileSync(tmpPath, "utf8"));
  unlinkSync(tmpPath);

  const source = output.results.find((entry) => entry.command === "source");
  const mini = output.results.find((entry) => entry.command === "mini");

  if (!source || !mini) {
    throw new Error("hyperfine output missing source/mini rows.");
  }

  const sourceNoise = coefficientOfVariation(source);
  const miniNoise = coefficientOfVariation(mini);
  const noisy = sourceNoise > NOISY_COEFFICIENT_THRESHOLD || miniNoise > NOISY_COEFFICIENT_THRESHOLD;

  return {
    output,
    source,
    mini,
    sourceNoise,
    miniNoise,
    noiseScore: Math.max(sourceNoise, miniNoise),
    noisy,
  };
}

function pickPreferredTrial(current, candidate) {
  if (!current) {
    return candidate;
  }

  return candidate.noiseScore < current.noiseScore ? candidate : current;
}

function benchmarkNoiseGuidance(profile) {
  if (profile !== "quiet") {
    return [];
  }

  return [
    "Quiet profile guidance: close heavy apps/tabs and avoid concurrent builds.",
    "Linux: pin benchmark to one core and performance governor (taskset + cpupower).",
    "macOS: run on AC power and prefer a low-background session.",
    "If noisy retry warnings persist, increase --runs and --iterations.",
  ];
}

function executeCompare(args, paths) {
  const hyperfineCheck = run("hyperfine", ["--version"], "pipe");
  if (hyperfineCheck.status !== 0) {
    throw new Error("hyperfine is required. Install it first (e.g. `brew install hyperfine`).");
  }

  const attempts = [];
  let selectedTrial = null;
  let noisyRetriesUsed = 0;
  let failRetriesUsed = 0;
  let attemptNumber = 0;

  while (true) {
    attemptNumber += 1;

    try {
      runPreflight({ component: args.component });

      const tmpPath = resolve(paths.resultsDir, `.hyperfine-${args.component}-${Date.now()}-${attemptNumber}.json`);
      const trial = runHyperfineTrial({
        component: args.component,
        iterations: args.iterations,
        runs: args.runs,
        warmup: args.warmup,
        tmpPath,
      });

      attempts.push({
        attempt: attemptNumber,
        status: trial.noisy ? "noise-retry" : "success",
        sourceNoise: trial.sourceNoise,
        miniNoise: trial.miniNoise,
        noisy: trial.noisy,
      });

      selectedTrial = pickPreferredTrial(selectedTrial, trial);

      if (!trial.noisy) {
        break;
      }

      if (noisyRetriesUsed >= args.maxRetries) {
        break;
      }

      noisyRetriesUsed += 1;
      console.warn(
        `[benchmark:compare] noisy trial ${attemptNumber} (source cv=${trial.sourceNoise.toFixed(4)}, mini cv=${trial.miniNoise.toFixed(4)}), retry ${noisyRetriesUsed}/${args.maxRetries}...`,
      );

      if (args.coolDownMs > 0) {
        sleep(args.coolDownMs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({
        attempt: attemptNumber,
        status: "process-failure",
        message,
      });

      if (failRetriesUsed >= args.maxFailRetries) {
        throw new Error(
          `[benchmark:compare] failed after ${attemptNumber} attempt(s) with ${failRetriesUsed} failure retr${failRetriesUsed === 1 ? "y" : "ies"}. Last error:\n${message}`,
        );
      }

      failRetriesUsed += 1;
      console.warn(
        `[benchmark:compare] execution failure on attempt ${attemptNumber}, retry ${failRetriesUsed}/${args.maxFailRetries}...`,
      );

      if (args.failCoolDownMs > 0) {
        sleep(args.failCoolDownMs);
      }
    }
  }

  if (!selectedTrial) {
    throw new Error("No successful trial was collected.");
  }

  const source = selectedTrial.source;
  const mini = selectedTrial.mini;

  const sourceCommandMeanMs = source.mean * 1000;
  const miniCommandMeanMs = mini.mean * 1000;
  const sourceAvgMs = sourceCommandMeanMs / args.iterations;
  const miniAvgMs = miniCommandMeanMs / args.iterations;
  const diffPct = ((miniAvgMs - sourceAvgMs) / sourceAvgMs) * 100;
  const metric = `contract.parse.${args.component}`;
  const thresholdPct = thresholdForMetric(metric);
  const gate = gateStatus(diffPct, thresholdPct);

  const summary = {
    timestamp: new Date().toISOString(),
    component: args.component,
    sourceSha: args.sourceSha,
    benchmarkTool: "hyperfine",
    metric,
    methodology: {
      phase: "contract-parse-validation",
      profile: args.profile,
      commandRuns: args.runs,
      warmupRuns: args.warmup,
      iterationsPerRun: args.iterations,
      retryPolicy: {
        maxRetries: args.maxRetries,
        coolDownMs: args.coolDownMs,
        maxFailRetries: args.maxFailRetries,
        failCoolDownMs: args.failCoolDownMs,
        coefficientThreshold: NOISY_COEFFICIENT_THRESHOLD,
        attempts,
      },
      notes: [
        "Each hyperfine run executes the parser loop in an isolated process.",
        "A preflight execution validates source/mini contract tasks before hyperfine warmup.",
        "Per-iteration latency is derived from hyperfine mean runtime divided by iterations.",
        "This metric covers contract parse/validation only; it excludes import, render, layout, paint, and network costs.",
        ...benchmarkNoiseGuidance(args.profile),
      ],
    },
    overallGate: gate,
    noise: {
      sourceCoefficient: selectedTrial.sourceNoise,
      miniCoefficient: selectedTrial.miniNoise,
      noisy: selectedTrial.noisy,
      threshold: NOISY_COEFFICIENT_THRESHOLD,
    },
    rows: [
      {
        metric,
        sourceAvgMs,
        miniAvgMs,
        sourceAvgUs: sourceAvgMs * 1000,
        miniAvgUs: miniAvgMs * 1000,
        diffPct,
        slowdownPct: diffPct,
        thresholdPct,
        gate,
        sourceStats: {
          commandMeanMs: source.mean * 1000,
          commandStdDevMs: source.stddev * 1000,
          commandMedianMs: source.median * 1000,
        },
        miniStats: {
          commandMeanMs: mini.mean * 1000,
          commandStdDevMs: mini.stddev * 1000,
          commandMedianMs: mini.median * 1000,
        },
      },
    ],
  };

  const base = `comparison-${args.component}-${Date.now()}`;
  const jsonPath = join(paths.comparisonDir, `${base}.json`);
  const mdPath = join(paths.comparisonDir, `${base}.md`);

  writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const markdown = [
    "# benchmark comparison (hyperfine)",
    "",
    `- Component: ${summary.component}`,
    `- Source SHA: ${summary.sourceSha}`,
    `- Metric: ${metric}`,
    `- Overall gate: ${summary.overallGate}`,
    `- Profile: ${args.profile}`,
    `- Runs: ${args.runs}, warmup: ${args.warmup}, iterations/run: ${args.iterations}`,
    `- Retry policy: maxRetries=${args.maxRetries}, coolDownMs=${args.coolDownMs}, maxFailRetries=${args.maxFailRetries}, failCoolDownMs=${args.failCoolDownMs}, noisyThreshold=${NOISY_COEFFICIENT_THRESHOLD}`,
    "",
    "| Metric | Source avg (µs) | Mini avg (µs) | Diff (%) | Threshold | Gate |",
    "|---|---:|---:|---:|---:|---|",
    `| ${metric} | ${formatUs(sourceAvgMs * 1000)} | ${formatUs(miniAvgMs * 1000)} | ${formatPercent(diffPct)} | ${thresholdPct}% | ${gate} |`,
    "",
    "## Noise",
    "",
    `- Source coefficient of variation: ${(selectedTrial.sourceNoise * 100).toFixed(2)}%`,
    `- Mini coefficient of variation: ${(selectedTrial.miniNoise * 100).toFixed(2)}%`,
    `- Above noisy threshold (${(NOISY_COEFFICIENT_THRESHOLD * 100).toFixed(2)}%): ${selectedTrial.noisy ? "yes" : "no"}`,
    "",
    "## Context",
    "",
    "- This benchmark measures contract parse/validation overhead only.",
    "- It does not represent full component load/render performance in an application runtime.",
    "- A preflight process validates benchmark commands before hyperfine execution.",
    ...benchmarkNoiseGuidance(args.profile).map((line) => `- ${line}`),
    "",
  ].join("\n");

  writeFileSync(mdPath, markdown);

  console.log("Benchmark comparison summary (hyperfine)");
  console.log(`Component: ${summary.component}`);
  console.log(`Metric: ${metric}`);
  console.log(`Profile: ${args.profile}`);
  console.log(`Source avg: ${formatUs(sourceAvgMs * 1000)}`);
  console.log(`Mini avg: ${formatUs(miniAvgMs * 1000)}`);
  console.log(`Diff: ${formatPercent(diffPct)} (threshold ${thresholdPct}%)`);
  console.log(
    `Noise: source cv ${(selectedTrial.sourceNoise * 100).toFixed(2)}%, mini cv ${(selectedTrial.miniNoise * 100).toFixed(2)}%`,
  );
  console.log(`Gate: ${gate}`);
  console.log(`Wrote comparison JSON: ${jsonPath}`);
  console.log(`Wrote comparison summary: ${mdPath}`);
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.mode === "help") {
    printUsage();
    return;
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const resultsDir = join(__dirname, "results");
  const comparisonDir = join(resultsDir, "comparisons");
  mkdirSync(comparisonDir, { recursive: true });

  executeCompare(parsed, { resultsDir, comparisonDir });
}

try {
  main();
} catch (error) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = 2;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
