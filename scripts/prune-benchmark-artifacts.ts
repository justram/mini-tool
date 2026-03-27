import { readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

type Options = {
  dryRun: boolean;
  keepRuntime: number;
  keepOverview: number;
  keepQualityGate: number;
  keepComparison: number;
  keepValidation: number;
  keepPng: number;
};

type RuntimeRecord = {
  groupKey: string;
  timestamp: number;
  paths: string[];
};

const USAGE = [
  "Usage: npx tsx scripts/prune-benchmark-artifacts.ts [options]",
  "",
  "Options:",
  "  --dry-run                 Show deletions without removing files",
  "  --keep-runtime <number>   Keep newest N runtime artifacts per (variant, component) group (default: 1)",
  "  --keep-overview <number>  Keep newest N overview-latency files (default: 3)",
  "  --keep-quality-gate <number>  Keep newest N quality-gate files per component (default: 1)",
  "  --keep-comparison <number>  Keep newest N comparison runs per stem (benchmarks/results + docs artifacts; default: 1)",
  "  --keep-validation <number>  Keep newest N validation files per scenario stem (default: 1)",
  "  --keep-png <number>  Keep newest N timestamped png files per stem (default: 1)",
  "  --help, -h                Show help",
].join("\n");

function parsePositiveInteger(input: string | undefined, fallback: number, flagName: string): number {
  if (!input) {
    return fallback;
  }

  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${input}`);
  }

  return parsed;
}

function parseArgs(argv: string[]): Options {
  const map = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }

    map.set(key, next);
    index += 1;
  }

  return {
    dryRun: flags.has("dry-run"),
    keepRuntime: parsePositiveInteger(map.get("keep-runtime"), 1, "--keep-runtime"),
    keepOverview: parsePositiveInteger(map.get("keep-overview"), 3, "--keep-overview"),
    keepQualityGate: parsePositiveInteger(map.get("keep-quality-gate"), 1, "--keep-quality-gate"),
    keepComparison: parsePositiveInteger(map.get("keep-comparison"), 1, "--keep-comparison"),
    keepValidation: parsePositiveInteger(map.get("keep-validation"), 1, "--keep-validation"),
    keepPng: parsePositiveInteger(map.get("keep-png"), 1, "--keep-png"),
  };
}

function collectRuntimeCandidates(runtimeDir: string): RuntimeRecord[] {
  const names = readdirSync(runtimeDir);
  const runtimePattern = /^runtime-(mini|source|smoke)-(.+)-(\d+)\.(json|md)$/u;
  const groupedByRun = new Map<string, RuntimeRecord>();

  for (const name of names) {
    const match = runtimePattern.exec(name);
    if (!match) {
      continue;
    }

    const variant = match[1];
    const component = match[2];
    const timestamp = Number.parseInt(match[3], 10);

    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const groupKey = `${variant}:${component}`;
    const runKey = `${groupKey}:${timestamp}`;
    const existing = groupedByRun.get(runKey);

    if (existing) {
      existing.paths.push(join(runtimeDir, name));
      continue;
    }

    groupedByRun.set(runKey, {
      groupKey,
      timestamp,
      paths: [join(runtimeDir, name)],
    });
  }

  return [...groupedByRun.values()];
}

function selectRuntimeDeletions(records: RuntimeRecord[], keepRuntime: number): string[] {
  const grouped = new Map<string, RuntimeRecord[]>();

  for (const record of records) {
    const bucket = grouped.get(record.groupKey);
    if (bucket) {
      bucket.push(record);
      continue;
    }

    grouped.set(record.groupKey, [record]);
  }

  const deletions: string[] = [];

  for (const entries of grouped.values()) {
    entries.sort((a, b) => b.timestamp - a.timestamp);
    const stale = entries.slice(keepRuntime);
    for (const run of stale) {
      for (const path of run.paths) {
        deletions.push(path);
      }
    }
  }

  return deletions;
}

function selectOverviewDeletions(artifactsDir: string, keepOverview: number): string[] {
  const names = readdirSync(artifactsDir);
  const overviewPattern = /^overview-latency-breakdown-(\d+)\.md$/u;

  const parsed = names
    .map((name) => {
      const match = overviewPattern.exec(name);
      if (!match) {
        return null;
      }

      const timestamp = Number.parseInt(match[1], 10);
      if (!Number.isFinite(timestamp)) {
        return null;
      }

      return {
        timestamp,
        path: join(artifactsDir, name),
      };
    })
    .filter((entry): entry is { timestamp: number; path: string } => entry !== null)
    .sort((a, b) => b.timestamp - a.timestamp || a.path.localeCompare(b.path));

  return parsed.slice(keepOverview).map((entry) => entry.path);
}

function selectQualityGateDeletions(artifactsDir: string, keepQualityGate: number): string[] {
  const names = readdirSync(artifactsDir);
  const qualityGatePattern = /^quality-gate-(.+)-(\d+)\.json$/u;

  const grouped = new Map<string, Array<{ timestamp: number; path: string }>>();

  for (const name of names) {
    const match = qualityGatePattern.exec(name);
    if (!match) {
      continue;
    }

    const component = match[1];
    const timestamp = Number.parseInt(match[2], 10);

    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const bucket = grouped.get(component);
    const record = { timestamp, path: join(artifactsDir, name) };
    if (bucket) {
      bucket.push(record);
      continue;
    }

    grouped.set(component, [record]);
  }

  const deletions: string[] = [];

  for (const entries of grouped.values()) {
    entries.sort((a, b) => b.timestamp - a.timestamp || a.path.localeCompare(b.path));
    for (const stale of entries.slice(keepQualityGate)) {
      deletions.push(stale.path);
    }
  }

  return deletions;
}

function selectTimestampedStemDeletions(
  artifactsDir: string,
  prefix: "comparison" | "validation",
  keepPerStem: number,
): string[] {
  const names = readdirSync(artifactsDir);
  const pattern = new RegExp(`^${prefix}-(.+)-(\\d+)\\.json$`, "u");

  const grouped = new Map<string, Array<{ timestamp: number; path: string }>>();

  for (const name of names) {
    const match = pattern.exec(name);
    if (!match) {
      continue;
    }

    const stem = match[1];
    const timestamp = Number.parseInt(match[2], 10);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const record = { timestamp, path: join(artifactsDir, name) };
    const bucket = grouped.get(stem);
    if (bucket) {
      bucket.push(record);
      continue;
    }

    grouped.set(stem, [record]);
  }

  const deletions: string[] = [];

  for (const entries of grouped.values()) {
    entries.sort((a, b) => b.timestamp - a.timestamp || a.path.localeCompare(b.path));
    for (const stale of entries.slice(keepPerStem)) {
      deletions.push(stale.path);
    }
  }

  return deletions;
}

function selectComparisonResultDeletions(comparisonsDir: string, keepPerStem: number): string[] {
  const names = readdirSync(comparisonsDir);
  const pattern = /^comparison-(.+)-(\d+)\.(json|md)$/u;

  const grouped = new Map<string, Map<number, string[]>>();

  for (const name of names) {
    const match = pattern.exec(name);
    if (!match) {
      continue;
    }

    const stem = match[1];
    const timestamp = Number.parseInt(match[2], 10);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const byTimestamp = grouped.get(stem) ?? new Map<number, string[]>();
    const paths = byTimestamp.get(timestamp) ?? [];
    paths.push(join(comparisonsDir, name));
    byTimestamp.set(timestamp, paths);
    grouped.set(stem, byTimestamp);
  }

  const deletions: string[] = [];

  for (const byTimestamp of grouped.values()) {
    const timestamps = [...byTimestamp.keys()].sort((a, b) => b - a);
    for (const staleTimestamp of timestamps.slice(keepPerStem)) {
      const paths = byTimestamp.get(staleTimestamp) ?? [];
      deletions.push(...paths);
    }
  }

  return deletions;
}

function selectTimestampedPngDeletions(artifactsDir: string, keepPerStem: number): string[] {
  const names = readdirSync(artifactsDir);
  const pattern = /^(.*)-(\d{10,})\.png$/u;

  const grouped = new Map<string, Array<{ timestamp: number; path: string }>>();

  for (const name of names) {
    const match = pattern.exec(name);
    if (!match) {
      continue;
    }

    const stem = match[1];
    const timestamp = Number.parseInt(match[2], 10);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const record = { timestamp, path: join(artifactsDir, name) };
    const bucket = grouped.get(stem);
    if (bucket) {
      bucket.push(record);
      continue;
    }

    grouped.set(stem, [record]);
  }

  const deletions: string[] = [];

  for (const entries of grouped.values()) {
    entries.sort((a, b) => b.timestamp - a.timestamp || a.path.localeCompare(b.path));
    for (const stale of entries.slice(keepPerStem)) {
      deletions.push(stale.path);
    }
  }

  return deletions;
}

function removeFiles(paths: string[], dryRun: boolean): void {
  for (const path of paths) {
    if (!dryRun) {
      unlinkSync(path);
    }

    console.log(`${dryRun ? "[dry-run] would remove" : "removed"}: ${path}`);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const options = parseArgs(argv);

  const runtimeDir = resolve(process.cwd(), "benchmarks", "results", "runtime");
  const comparisonsDir = resolve(process.cwd(), "benchmarks", "results", "comparisons");
  const artifactsDir = resolve(process.cwd(), "docs", "migrations", "artifacts");

  const runtimeRecords = collectRuntimeCandidates(runtimeDir);
  const runtimeDeletions = selectRuntimeDeletions(runtimeRecords, options.keepRuntime);
  const comparisonResultDeletions = selectComparisonResultDeletions(comparisonsDir, options.keepComparison);
  const overviewDeletions = selectOverviewDeletions(artifactsDir, options.keepOverview);
  const qualityGateDeletions = selectQualityGateDeletions(artifactsDir, options.keepQualityGate);
  const comparisonDeletions = selectTimestampedStemDeletions(artifactsDir, "comparison", options.keepComparison);
  const validationDeletions = selectTimestampedStemDeletions(artifactsDir, "validation", options.keepValidation);
  const pngDeletions = selectTimestampedPngDeletions(artifactsDir, options.keepPng);

  removeFiles(runtimeDeletions, options.dryRun);
  removeFiles(comparisonResultDeletions, options.dryRun);
  removeFiles(overviewDeletions, options.dryRun);
  removeFiles(qualityGateDeletions, options.dryRun);
  removeFiles(comparisonDeletions, options.dryRun);
  removeFiles(validationDeletions, options.dryRun);
  removeFiles(pngDeletions, options.dryRun);

  console.log(
    `[prune-benchmark-artifacts] ${options.dryRun ? "Would remove" : "Removed"} ${runtimeDeletions.length} runtime files, ${comparisonResultDeletions.length} hyperfine comparison result files, ${overviewDeletions.length} overview files, ${qualityGateDeletions.length} quality-gate files, ${comparisonDeletions.length} docs comparison files, ${validationDeletions.length} validation files, and ${pngDeletions.length} png files.`,
  );
}

main();
