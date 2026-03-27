#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function latestByPattern(dir, pattern) {
  const files = readdirSync(dir)
    .filter((name) => pattern.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return null;
  }

  return join(dir, files[files.length - 1]);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latestComparisonArtifact(comparisonDir, component) {
  const escaped = escapeRegex(component);
  return latestByPattern(comparisonDir, new RegExp(`^comparison-${escaped}-\\d+\\.json$`));
}

function latestRuntimeArtifact(runtimeDir, variant, component) {
  const escaped = escapeRegex(component);
  const withVariant = latestByPattern(runtimeDir, new RegExp(`^runtime-${variant}-${escaped}-\\d+\\.json$`));
  if (withVariant) {
    return withVariant;
  }

  if (variant === "mini") {
    return latestByPattern(runtimeDir, new RegExp(`^runtime-${escaped}-\\d+\\.json$`));
  }

  return null;
}

function pctDiff(miniValue, sourceValue) {
  if (!Number.isFinite(miniValue) || !Number.isFinite(sourceValue) || sourceValue === 0) {
    return null;
  }

  return ((miniValue - sourceValue) / sourceValue) * 100;
}

function formatMaybe(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return Number(value).toFixed(digits);
}

const comparisonDir = resolve(process.cwd(), "benchmarks", "results", "comparisons");
const runtimeDir = resolve(process.cwd(), "benchmarks", "results", "runtime");
const outputDir = resolve(process.cwd(), "docs", "migrations", "artifacts");
mkdirSync(outputDir, { recursive: true });

const runtimeFiles = readdirSync(runtimeDir).filter((name) => /^runtime-.*-\d+\.json$/.test(name));
const components = new Set();
for (const file of runtimeFiles) {
  const matched = file.match(/^runtime-(mini|source)-(.+)-\d+\.json$/);
  if (matched) {
    components.add(matched[2]);
    continue;
  }

  const legacy = file.match(/^runtime-(.+)-\d+\.json$/);
  if (legacy) {
    components.add(legacy[1]);
  }
}

const rows = [];
for (const component of [...components].sort()) {
  const parsePath = latestComparisonArtifact(comparisonDir, component);
  const miniRuntimePath = latestRuntimeArtifact(runtimeDir, "mini", component);
  const sourceRuntimePath = latestRuntimeArtifact(runtimeDir, "source", component);

  if (!parsePath || !miniRuntimePath) {
    continue;
  }

  const parseData = JSON.parse(readFileSync(parsePath, "utf8"));
  const parseRow = (parseData.rows ?? [])[0] ?? {};
  const miniRuntimeData = JSON.parse(readFileSync(miniRuntimePath, "utf8"));
  const sourceRuntimeData = sourceRuntimePath ? JSON.parse(readFileSync(sourceRuntimePath, "utf8")) : null;

  const miniDefine = miniRuntimeData.metrics?.defineReadyMs?.mean;
  const miniMountWork = miniRuntimeData.metrics?.mountWorkAvgMs?.mean;
  const miniMountFrame = miniRuntimeData.metrics?.mountFrameAvgMs?.mean;
  const miniMountTotal = miniRuntimeData.metrics?.mountTotalAvgMs?.mean;
  const miniUpdateWork = miniRuntimeData.metrics?.updateWorkAvgMs?.mean;
  const miniUpdateFrame = miniRuntimeData.metrics?.updateFrameAvgMs?.mean;
  const miniUpdateTotal = miniRuntimeData.metrics?.updateTotalAvgMs?.mean;

  const sourceDefine = sourceRuntimeData?.metrics?.defineReadyMs?.mean;
  const sourceMountWork = sourceRuntimeData?.metrics?.mountWorkAvgMs?.mean;
  const sourceMountFrame = sourceRuntimeData?.metrics?.mountFrameAvgMs?.mean;
  const sourceMountTotal = sourceRuntimeData?.metrics?.mountTotalAvgMs?.mean;
  const sourceUpdateWork = sourceRuntimeData?.metrics?.updateWorkAvgMs?.mean;
  const sourceUpdateFrame = sourceRuntimeData?.metrics?.updateFrameAvgMs?.mean;
  const sourceUpdateTotal = sourceRuntimeData?.metrics?.updateTotalAvgMs?.mean;

  rows.push({
    component,
    sourceParseUs: parseRow.sourceAvgUs,
    miniParseUs: parseRow.miniAvgUs,
    parseDiffPct: parseRow.diffPct ?? parseRow.slowdownPct,
    parseGate: parseRow.gate,
    sourceDefine,
    miniDefine,
    defineDiffPct: pctDiff(miniDefine, sourceDefine),
    sourceMountWork,
    miniMountWork,
    mountWorkDiffPct: pctDiff(miniMountWork, sourceMountWork),
    sourceUpdateWork,
    miniUpdateWork,
    updateWorkDiffPct: pctDiff(miniUpdateWork, sourceUpdateWork),
    sourceMountFrame,
    miniMountFrame,
    mountFrameDiffPct: pctDiff(miniMountFrame, sourceMountFrame),
    sourceMountTotal,
    miniMountTotal,
    mountTotalDiffPct: pctDiff(miniMountTotal, sourceMountTotal),
    sourceUpdateFrame,
    miniUpdateFrame,
    updateFrameDiffPct: pctDiff(miniUpdateFrame, sourceUpdateFrame),
    sourceUpdateTotal,
    miniUpdateTotal,
    updateTotalDiffPct: pctDiff(miniUpdateTotal, sourceUpdateTotal),
    parseArtifact: parsePath,
    miniRuntimeArtifact: miniRuntimePath,
    sourceRuntimeArtifact: sourceRuntimePath,
  });
}

const timestamp = Date.now();
const outputPath = join(outputDir, `overview-latency-breakdown-${timestamp}.md`);

const lines = [
  "# Latency Breakdown Overview",
  "",
  "This report is phase-oriented and splits latency interpretation into two views:",
  "- **Implementation Work View**: parse/validation + setup + render work (best for code-level optimization decisions).",
  "- **User-Perceived View**: setup + render total (work + frame wait) for perceived settle latency.",
  "",
  "## Implementation Work View",
  "",
  "| Component | Input Contract Check (Tool-UI, μs) | Input Contract Check (Mini-Tool, μs) | Diff (%) | Contract Gate | Setup Ready (Tool-UI, ms) | Setup Ready (Mini-Tool, ms) | Diff (%) | First Paint Work (Tool-UI, ms) | First Paint Work (Mini-Tool, ms) | Diff (%) | Data Refresh Work (Tool-UI, ms) | Data Refresh Work (Mini-Tool, ms) | Diff (%) |",
  "|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
];

for (const row of rows) {
  lines.push(
    `| ${row.component} | ${formatMaybe(row.sourceParseUs, 3)} | ${formatMaybe(row.miniParseUs, 3)} | ${formatMaybe(row.parseDiffPct, 2)} | ${row.parseGate ?? "n/a"} | ${formatMaybe(row.sourceDefine, 3)} | ${formatMaybe(row.miniDefine, 3)} | ${formatMaybe(row.defineDiffPct, 2)} | ${formatMaybe(row.sourceMountWork, 3)} | ${formatMaybe(row.miniMountWork, 3)} | ${formatMaybe(row.mountWorkDiffPct, 2)} | ${formatMaybe(row.sourceUpdateWork, 3)} | ${formatMaybe(row.miniUpdateWork, 3)} | ${formatMaybe(row.updateWorkDiffPct, 2)} |`,
  );
}

lines.push(
  "",
  "## User-Perceived View",
  "",
  "| Component | First Paint Frame Wait (Tool-UI, ms) | First Paint Frame Wait (Mini-Tool, ms) | Diff (%) | First Paint Total (Tool-UI, ms) | First Paint Total (Mini-Tool, ms) | Diff (%) | Refresh Frame Wait (Tool-UI, ms) | Refresh Frame Wait (Mini-Tool, ms) | Diff (%) | Refresh Total (Tool-UI, ms) | Refresh Total (Mini-Tool, ms) | Diff (%) |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
);

for (const row of rows) {
  lines.push(
    `| ${row.component} | ${formatMaybe(row.sourceMountFrame, 3)} | ${formatMaybe(row.miniMountFrame, 3)} | ${formatMaybe(row.mountFrameDiffPct, 2)} | ${formatMaybe(row.sourceMountTotal, 3)} | ${formatMaybe(row.miniMountTotal, 3)} | ${formatMaybe(row.mountTotalDiffPct, 2)} | ${formatMaybe(row.sourceUpdateFrame, 3)} | ${formatMaybe(row.miniUpdateFrame, 3)} | ${formatMaybe(row.updateFrameDiffPct, 2)} | ${formatMaybe(row.sourceUpdateTotal, 3)} | ${formatMaybe(row.miniUpdateTotal, 3)} | ${formatMaybe(row.updateTotalDiffPct, 2)} |`,
  );
}

lines.push(
  "",
  "## Phase Coverage Status",
  "",
  "| Lifecycle phase | Current metric(s) | Coverage status |",
  "|---|---|---|",
  "| Contract parse + validation | Input Contract Check (µs) | Implemented |",
  "| Component setup + readiness | defineReadyMs | Implemented |",
  "| Component mount + first render | mountWorkAvgMs + mountFrameAvgMs + mountTotalAvgMs | Implemented |",
  "| Component update render | updateWorkAvgMs + updateFrameAvgMs + updateTotalAvgMs | Implemented |",
  "",
  "## Metric semantics",
  "",
  "- Input Contract Check (Tool-UI / Mini-Tool): payload validation cost before UI render (schema safety overhead).",
  "- Diff (%): `(mini - source) / source * 100` for the corresponding lifecycle checkpoint.",
  "- Setup Ready: runtime cold-start readiness cost (module import/evaluation + registration). This is separate from schema validation.",
  "- First Paint Work / Data Refresh Work: component/framework work latency (frame wait excluded).",
  "- First Paint/Refresh Frame Wait: scheduler/frame cadence latency after work completes.",
  "- First Paint/Refresh Total: work + frame wait (proxy for user-perceived settle latency).",
  "- Negative Diff (%) means mini is faster.",
  "",
  "## Caveats",
  "",
  "- Parse and runtime phases are different; do not compare parse µs to runtime ms magnitudes directly.",
  "- Runtime baseline currently covers only components implemented in the source runtime harness.",
  "- Frame wait is highly environment-dependent (refresh rate, load, VM/container jitter). Use Work metrics as primary implementation signal.",
  "",
);

writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(`Wrote latency overview: ${outputPath}`);
