import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CROP_MIN_SIZE_MISMATCH_WAIVER_TOKEN = "allow-crop-min-size-mismatch";

type QualityGateSummary = {
  requestedComponents?: string[];
  totalChecks?: number;
  failedChecks?: number;
  records?: Array<{
    component?: string;
    theme?: string;
    status?: string;
  }>;
};

type MigrationValidationSummary = {
  finalStatus?: string;
  promotionBlockers?: string[];
  artifacts?: {
    visualSummaries?: string[];
  };
};

type VisualSummary = {
  theme?: string;
  diff?: {
    gate?: string;
    matchMode?: "exact" | "crop-min";
    usedCropping?: boolean;
    sourceSize?: string;
    miniSize?: string;
  };
};

type SourceBaselineSummary = {
  component?: string;
  benches?: Array<{ name?: string }>;
};

type MiniBenchmarkSummary = {
  benches?: Array<{ name?: string }>;
};

type ComparisonSummary = {
  component?: string;
  overallGate?: string;
  metric?: string;
  rows?: Array<{ metric?: string; gate?: string }>;
};

export type VerifiedReadinessEvidence = {
  qualitySummaryPath: string;
  migrationSummaryPath: string;
  sourceBaselinePath: string;
  miniBenchmarkPath: string;
  comparisonPath: string;
};

const artifactsDir = resolve(process.cwd(), "docs/migrations/artifacts");
const benchmarkResultsDir = resolve(process.cwd(), "benchmarks/results");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function listMatchingFiles(directory: string, pattern: RegExp): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((fileName) => pattern.test(fileName))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => resolve(directory, fileName));
}

function latestFile(files: string[], errorMessage: string): string {
  const latest = files[files.length - 1];
  if (!latest) {
    throw new Error(errorMessage);
  }

  return latest;
}

function isCropMinSizeMismatch(visualSummary: VisualSummary): boolean {
  const diff = visualSummary.diff;
  if (!diff || diff.matchMode !== "crop-min" || diff.usedCropping !== true) {
    return false;
  }

  if (!diff.sourceSize || !diff.miniSize) {
    return true;
  }

  return diff.sourceSize !== diff.miniSize;
}

function ensureQualityEvidence(component: string): string {
  const files = listMatchingFiles(artifactsDir, new RegExp(`^quality-gate-${component}-\\d+\\.json$`));
  const summaryPath = latestFile(
    files,
    `Cannot set '${component}' to verified: missing quality gate summary. Run quality:gate -- --component ${component} --skip-contract first.`,
  );

  const summary = readJson<QualityGateSummary>(summaryPath);
  if ((summary.failedChecks ?? 0) > 0) {
    throw new Error(`Cannot set '${component}' to verified: latest quality gate has failed checks (${summaryPath}).`);
  }

  if ((summary.totalChecks ?? 0) <= 0) {
    throw new Error(`Cannot set '${component}' to verified: latest quality gate has no checks (${summaryPath}).`);
  }

  const componentRecords = (summary.records ?? []).filter((record) => record.component === component);
  if (componentRecords.length === 0) {
    throw new Error(
      `Cannot set '${component}' to verified: latest quality gate summary has no records for component '${component}' (${summaryPath}).`,
    );
  }

  const nonPassRecord = componentRecords.find((record) => record.status !== "pass");
  if (nonPassRecord) {
    throw new Error(
      `Cannot set '${component}' to verified: component quality checks are not all pass (${summaryPath}).`,
    );
  }

  const themes = new Set(
    componentRecords.map((record) => record.theme).filter((theme): theme is string => Boolean(theme)),
  );
  if (!themes.has("light") || !themes.has("dark")) {
    throw new Error(
      `Cannot set '${component}' to verified: quality gate evidence must include both light and dark theme checks (${summaryPath}).`,
    );
  }

  return summaryPath;
}

function ensureMigrationEvidence(component: string, waiver: string): string {
  const files = listMatchingFiles(artifactsDir, new RegExp(`^validation-${component}-\\d+\\.json$`));
  const summaryPath = latestFile(
    files,
    `Cannot set '${component}' to verified: missing migration validation summary. Run migration:gate with source + mini URLs first.`,
  );

  const summary = readJson<MigrationValidationSummary>(summaryPath);
  if (summary.finalStatus !== "pass") {
    throw new Error(`Cannot set '${component}' to verified: latest migration validation is not pass (${summaryPath}).`);
  }

  const effectiveWaiver = waiver.trim();
  const hasCropMismatchWaiver = effectiveWaiver.includes(CROP_MIN_SIZE_MISMATCH_WAIVER_TOKEN);
  const summaryCropMismatchBlockers = summary.promotionBlockers?.filter((blocker) =>
    blocker.startsWith("crop-min-size-mismatch:"),
  );

  if ((summaryCropMismatchBlockers?.length ?? 0) > 0 && !hasCropMismatchWaiver) {
    throw new Error(
      `Cannot set '${component}' to verified: migration summary includes crop-min size mismatch blocker(s). Add waiver token '${CROP_MIN_SIZE_MISMATCH_WAIVER_TOKEN}' in tracking waiver field after manual sign-off (${summaryPath}).`,
    );
  }

  const visualSummaries = summary.artifacts?.visualSummaries ?? [];
  if (visualSummaries.length < 2) {
    throw new Error(
      `Cannot set '${component}' to verified: latest migration validation has insufficient visual summaries (${summaryPath}).`,
    );
  }

  const themes = new Set<string>();
  for (const visualSummaryPath of visualSummaries) {
    if (!existsSync(visualSummaryPath)) {
      throw new Error(`Cannot set '${component}' to verified: visual summary file is missing (${visualSummaryPath}).`);
    }

    const visualSummary = readJson<VisualSummary>(visualSummaryPath);
    if (visualSummary.diff?.gate !== "PASS") {
      throw new Error(`Cannot set '${component}' to verified: visual diff gate is not PASS (${visualSummaryPath}).`);
    }

    if (isCropMinSizeMismatch(visualSummary) && !hasCropMismatchWaiver) {
      throw new Error(
        `Cannot set '${component}' to verified: crop-min size mismatch is non-verifiable by default (${visualSummaryPath}). Add waiver token '${CROP_MIN_SIZE_MISMATCH_WAIVER_TOKEN}' in tracking waiver field after manual sign-off.`,
      );
    }

    if (visualSummary.theme) {
      themes.add(visualSummary.theme);
    }
  }

  if (!themes.has("light") || !themes.has("dark")) {
    throw new Error(
      `Cannot set '${component}' to verified: visual summaries must include both light and dark themes (${summaryPath}).`,
    );
  }

  return summaryPath;
}

function ensureBenchmarkEvidence(component: string): {
  sourceBaselinePath: string;
  miniBenchmarkPath: string;
  comparisonPath: string;
} {
  const sourceBaselineDir = resolve(benchmarkResultsDir, "source-baseline");
  const comparisonDir = resolve(benchmarkResultsDir, "comparisons");

  const sourceFiles = listMatchingFiles(sourceBaselineDir, new RegExp(`^${component}-\\d+\\.json$`));
  const sourceBaselinePath = latestFile(
    sourceFiles,
    `Cannot set '${component}' to verified: missing source baseline benchmark artifact. Run benchmark:source for '${component}'.`,
  );

  const sourceBaseline = readJson<SourceBaselineSummary>(sourceBaselinePath);
  if (sourceBaseline.component !== component) {
    throw new Error(
      `Cannot set '${component}' to verified: latest source baseline artifact component mismatch (${sourceBaselinePath}).`,
    );
  }

  const sourceMetric = `contract.parse.${component}`;
  if (!(sourceBaseline.benches ?? []).some((bench) => bench.name === sourceMetric)) {
    throw new Error(
      `Cannot set '${component}' to verified: source baseline missing '${sourceMetric}' metric (${sourceBaselinePath}).`,
    );
  }

  const miniFiles = listMatchingFiles(benchmarkResultsDir, /^bench-\d+\.json$/);
  const miniBenchmarkPath = latestFile(
    miniFiles,
    `Cannot set '${component}' to verified: missing mini benchmark artifact. Run benchmark for '${component}'.`,
  );

  const miniBenchmark = readJson<MiniBenchmarkSummary>(miniBenchmarkPath);
  if (!(miniBenchmark.benches ?? []).some((bench) => bench.name === sourceMetric)) {
    throw new Error(
      `Cannot set '${component}' to verified: latest mini benchmark artifact is missing '${sourceMetric}' (${miniBenchmarkPath}).`,
    );
  }

  const comparisonFiles = listMatchingFiles(comparisonDir, new RegExp(`^comparison-${component}-\\d+\\.json$`));
  const comparisonPath = latestFile(
    comparisonFiles,
    `Cannot set '${component}' to verified: missing benchmark comparison artifact. Run benchmark:compare for '${component}'.`,
  );

  const comparison = readJson<ComparisonSummary>(comparisonPath);
  if (comparison.component !== component) {
    throw new Error(
      `Cannot set '${component}' to verified: latest benchmark comparison component mismatch (${comparisonPath}).`,
    );
  }

  if (comparison.overallGate !== "PASS") {
    throw new Error(
      `Cannot set '${component}' to verified: benchmark comparison gate is not PASS (${comparisonPath}).`,
    );
  }

  const compareMetric = comparison.metric ?? sourceMetric;
  const rowForMetric = (comparison.rows ?? []).find(
    (row) => row.metric === compareMetric || row.metric === sourceMetric,
  );
  if (!rowForMetric || rowForMetric.gate !== "PASS") {
    throw new Error(
      `Cannot set '${component}' to verified: benchmark comparison row gate for '${sourceMetric}' is not PASS (${comparisonPath}).`,
    );
  }

  return {
    sourceBaselinePath,
    miniBenchmarkPath,
    comparisonPath,
  };
}

export function ensureVerifiedReadiness(component: string, waiver: string): VerifiedReadinessEvidence {
  const qualitySummaryPath = ensureQualityEvidence(component);
  const migrationSummaryPath = ensureMigrationEvidence(component, waiver);
  const benchmarkEvidence = ensureBenchmarkEvidence(component);

  return {
    qualitySummaryPath,
    migrationSummaryPath,
    sourceBaselinePath: benchmarkEvidence.sourceBaselinePath,
    miniBenchmarkPath: benchmarkEvidence.miniBenchmarkPath,
    comparisonPath: benchmarkEvidence.comparisonPath,
  };
}

function parseArgs(argv: string[]): { component?: string; waiver: string; help: boolean } {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    if (key === "help" || key === "h") {
      args.set("help", "true");
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    args.set(key, value);
    index += 1;
  }

  return {
    component: args.get("component"),
    waiver: args.get("waiver") ?? "",
    help: args.get("help") === "true",
  };
}

function usage(): string {
  return [
    "Usage:",
    "  npx tsx scripts/check-verified-readiness.ts --component <name> [--waiver <tokens>]",
    "",
    "Checks:",
    "  - latest component quality-gate artifact exists and is fully pass (light + dark)",
    "  - latest component migration validation artifact exists and is pass (visual light + dark PASS)",
    "  - benchmark evidence exists and passes (source-baseline, mini bench row, comparison PASS)",
    `  - crop-min size mismatch requires waiver token '${CROP_MIN_SIZE_MISMATCH_WAIVER_TOKEN}'`,
  ].join("\n");
}

function runCli(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (!options.component) {
    throw new Error(`Missing required --component argument.\n\n${usage()}`);
  }

  const evidence = ensureVerifiedReadiness(options.component, options.waiver);
  console.log("Verified-readiness check passed.");
  console.log(`component: ${options.component}`);
  console.log(`quality summary: ${evidence.qualitySummaryPath}`);
  console.log(`migration summary: ${evidence.migrationSummaryPath}`);
  console.log(`source baseline: ${evidence.sourceBaselinePath}`);
  console.log(`mini benchmark: ${evidence.miniBenchmarkPath}`);
  console.log(`benchmark comparison: ${evidence.comparisonPath}`);
}

import { pathToFileURL } from "node:url";

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  runCli();
}
