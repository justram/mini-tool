import { spawnSync } from "node:child_process";
import process from "node:process";
import { benchmarkComponents } from "./component-registry";

type Profile = "default" | "quiet";

type Options = {
  profile: Profile;
  iterations?: number;
  runs?: number;
  warmup?: number;
  maxRetries?: number;
  coolDownMs?: number;
  componentFilter?: string;
};

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

  const profileRaw = map.get("profile") ?? "default";
  if (profileRaw !== "default" && profileRaw !== "quiet") {
    throw new Error("--profile must be one of: default, quiet");
  }

  const componentFilter = map.get("component");
  if (componentFilter && !benchmarkComponents.includes(componentFilter as (typeof benchmarkComponents)[number])) {
    throw new Error(`Unknown component '${componentFilter}'. Supported: ${benchmarkComponents.join(", ")}`);
  }

  const parseOptionalNumber = (key: string): number | undefined => {
    const value = map.get(key);
    if (!value) {
      return undefined;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error(`--${key} must be a positive number.`);
    }

    return numeric;
  };

  return {
    profile: profileRaw,
    iterations: parseOptionalNumber("iterations"),
    runs: parseOptionalNumber("runs"),
    warmup: parseOptionalNumber("warmup"),
    maxRetries: parseOptionalNumber("max-retries"),
    coolDownMs: parseOptionalNumber("cool-down-ms"),
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

function buildTasks(options: Options): string[] {
  if (options.componentFilter) {
    return [options.componentFilter];
  }

  return [...benchmarkComponents];
}

function runCompareForComponent(component: string, options: Options): void {
  const args = ["benchmarks/compare-hyperfine.mjs", "--component", component, "--profile", options.profile];

  if (options.iterations !== undefined) {
    args.push("--iterations", String(options.iterations));
  }
  if (options.runs !== undefined) {
    args.push("--runs", String(options.runs));
  }
  if (options.warmup !== undefined) {
    args.push("--warmup", String(options.warmup));
  }
  if (options.maxRetries !== undefined) {
    args.push("--max-retries", String(options.maxRetries));
  }
  if (options.coolDownMs !== undefined) {
    args.push("--cool-down-ms", String(options.coolDownMs));
  }

  const result = spawnSync("node", args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`compare benchmark failed for ${component}`);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const tasks = buildTasks(options);
  const startedAt = Date.now();

  console.log(`Running compare benchmark sweep (${tasks.length} components, profile=${options.profile})`);

  for (let index = 0; index < tasks.length; index += 1) {
    const component = tasks[index];
    const done = index;

    const elapsedMs = Date.now() - startedAt;
    const avgTaskMs = done > 0 ? elapsedMs / done : 0;
    const etaMs = done > 0 ? avgTaskMs * (tasks.length - done) : 0;
    const progress = formatProgress(done, tasks.length);

    console.log(
      `\n[full-compare] [${progress}] ${done}/${tasks.length} elapsed ${formatDuration(elapsedMs)} eta ${formatDuration(etaMs)}`,
    );
    console.log(`[full-compare] starting ${component}`);

    runCompareForComponent(component, options);
  }

  const elapsedMs = Date.now() - startedAt;
  const progress = formatProgress(tasks.length, tasks.length);
  console.log(
    `\n[full-compare] [${progress}] ${tasks.length}/${tasks.length} elapsed ${formatDuration(elapsedMs)} eta 0ms`,
  );
  console.log("[full-compare] complete");
}

main();
