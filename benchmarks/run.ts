#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { isBenchmarkComponent } from "./component-registry";
import { benchmarkModules } from "./modules";
import { type BenchmarkRow, createContractParseRow } from "./modules/shared";

type BenchResult = {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
};

type CliOptions = {
  component?: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(__dirname, "results");
mkdirSync(resultsDir, { recursive: true });

function bench(row: BenchmarkRow): BenchResult {
  const startedAt = performance.now();

  for (let index = 0; index < row.iterations; index += 1) {
    row.run();
  }

  const totalMs = performance.now() - startedAt;
  return {
    name: row.name,
    iterations: row.iterations,
    totalMs,
    avgMs: totalMs / row.iterations,
  };
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    if (key === "help" || key === "h") {
      console.log("Usage: npx tsx benchmarks/run.ts [--component <name>]");
      process.exit(0);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    args.set(key, value);
    index += 1;
  }

  const component = args.get("component");
  if (component && !isBenchmarkComponent(component)) {
    throw new Error(`Unsupported benchmark component '${component}'.`);
  }

  return { component };
}

function readFixture(component: string): unknown {
  const fixturePath = join(__dirname, "fixtures", `${component}.json`);
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

function buildRows(options: CliOptions): BenchmarkRow[] {
  const moduleCandidates = options.component
    ? benchmarkModules.filter((module) => module.component === options.component)
    : benchmarkModules;

  const rows = moduleCandidates.map((module) => {
    const fixture = readFixture(module.component);
    return createContractParseRow(module, fixture);
  });

  if (!options.component) {
    const linkPreviewFixture = readFixture("link-preview") as { id: string; href: string; title?: string };
    rows.push({
      name: "render.template.link-preview",
      iterations: 100_000,
      run: () => {
        const html = `<article data-id="${linkPreviewFixture.id}"><a href="${linkPreviewFixture.href}">${linkPreviewFixture.title}</a></article>`;
        if (!html.includes("article")) {
          throw new Error("unexpected template output");
        }
      },
    });
  }

  return rows;
}

function writeArtifacts(results: { timestamp: string; benches: BenchResult[] }): { jsonPath: string; mdPath: string } {
  const fileBase = `bench-${Date.now()}`;
  const jsonPath = join(resultsDir, `${fileBase}.json`);
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  let markdown = "# mini-tool benchmark results\n\n";
  markdown += `- Timestamp: ${results.timestamp}\n\n`;
  markdown += "| Benchmark | Iterations | Total | Avg / iteration |\n";
  markdown += "|---|---:|---:|---:|\n";
  for (const row of results.benches) {
    markdown += `| ${row.name} | ${row.iterations} | ${row.totalMs.toFixed(2)} ms | ${row.avgMs.toFixed(6)} ms |\n`;
  }

  const mdPath = join(resultsDir, `${fileBase}.md`);
  writeFileSync(mdPath, markdown);

  return { jsonPath, mdPath };
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const benches = buildRows(options).map((row) => bench(row));
  const results = {
    timestamp: new Date().toISOString(),
    benches,
  };

  const artifacts = writeArtifacts(results);
  console.log(`Wrote benchmark JSON: ${artifacts.jsonPath}`);
  console.log(`Wrote benchmark summary: ${artifacts.mdPath}`);
}

main();
