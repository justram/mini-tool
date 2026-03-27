import { spawnSync } from "node:child_process";
import process from "node:process";
import { benchmarkComponents } from "./component-registry";

type Variant = "source" | "mini";
type RuntimeProfile = "default" | "quiet";

type Options = {
  profile: RuntimeProfile;
  runs: number;
  warmup: number;
  iterations: number;
  componentFilter?: string;
};

const VARIANTS: Variant[] = ["source", "mini"];

function parseArgs(argv: string[]): Options {
  const map = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      continue;
    }

    map.set(token.slice(2), next);
    index += 1;
  }

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
  const componentFilter = map.get("component");

  if (profile !== "default" && profile !== "quiet") {
    throw new Error("--profile must be one of: default, quiet.");
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

  if (componentFilter && !benchmarkComponents.includes(componentFilter as (typeof benchmarkComponents)[number])) {
    throw new Error(`Unknown component '${componentFilter}'. Supported: ${benchmarkComponents.join(", ")}`);
  }

  return {
    profile,
    runs,
    warmup,
    iterations,
    componentFilter,
  };
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

function formatProgress(current: number, total: number, width = 30): string {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const filled = Math.round(ratio * width);
  return `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
}

function runTask(component: string, variant: Variant, options: Options): void {
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "benchmarks/runtime-breakdown.ts",
      "--variant",
      variant,
      "--component",
      component,
      "--profile",
      options.profile,
      "--runs",
      String(options.runs),
      "--warmup",
      String(options.warmup),
      "--iterations",
      String(options.iterations),
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    throw new Error(`runtime task failed for ${variant}:${component}`);
  }
}

function buildTasks(options: Options): Array<{ component: string; variant: Variant }> {
  const components = options.componentFilter ? [options.componentFilter] : [...benchmarkComponents];
  const tasks: Array<{ component: string; variant: Variant }> = [];

  for (const component of components) {
    for (const variant of VARIANTS) {
      tasks.push({ component, variant });
    }
  }

  return tasks;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const tasks = buildTasks(options);
  const startedAt = Date.now();

  console.log(
    `Running full runtime benchmark sweep (${tasks.length} tasks, profile=${options.profile}, runs=${options.runs}, warmup=${options.warmup}, iterations=${options.iterations})`,
  );

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const done = index;
    const elapsedMs = Date.now() - startedAt;
    const avgTaskMs = done > 0 ? elapsedMs / done : 0;
    const etaMs = done > 0 ? avgTaskMs * (tasks.length - done) : 0;
    const progress = formatProgress(done, tasks.length);

    console.log(
      `\n[full-runtime] [${progress}] ${done}/${tasks.length} elapsed ${formatDuration(elapsedMs)} eta ${formatDuration(etaMs)}`,
    );
    console.log(`[full-runtime] starting ${task.variant}:${task.component}`);

    runTask(task.component, task.variant, options);
  }

  const totalElapsedMs = Date.now() - startedAt;
  const progress = formatProgress(tasks.length, tasks.length);
  console.log(
    `\n[full-runtime] [${progress}] ${tasks.length}/${tasks.length} elapsed ${formatDuration(totalElapsedMs)} eta 0ms`,
  );
  console.log("[full-runtime] complete");
}

main();
