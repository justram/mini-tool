import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getSourceEquivalentParser } from "./source-contract-adapters";

type Args = {
  component: string;
  iterations: number;
  sourceSha: string;
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key?.startsWith("--")) {
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }

    map.set(key.slice(2), value);
    i += 1;
  }

  const component = map.get("component") ?? "link-preview";
  const iterations = Number(map.get("iterations") ?? "20000");
  const sourceSha = map.get("sha") ?? "unknown";

  return { component, iterations, sourceSha };
}

function bench(iterations: number, fn: () => void): { totalMs: number; avgMs: number } {
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    fn();
  }

  const totalMs = performance.now() - start;
  return {
    totalMs,
    avgMs: totalMs / iterations,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const parseFromSourceEquivalent = getSourceEquivalentParser(args.component);

  const fixturePath = resolve(process.cwd(), "benchmarks", "fixtures", `${args.component}.json`);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  const benchResult = bench(args.iterations, () => {
    parseFromSourceEquivalent(fixture);
  });

  const root = dirname(fileURLToPath(import.meta.url));
  const outputDir = join(root, "results", "source-baseline");
  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const fileBase = `${args.component}-${Date.now()}`;

  const jsonPath = join(outputDir, `${fileBase}.json`);
  const result = {
    timestamp,
    sourceRepo: "../tool-ui",
    sourceSha: args.sourceSha,
    component: args.component,
    methodology: "Native source Zod contract parsing loaded from tool-ui source adapters",
    benches: [
      {
        name: `contract.parse.${args.component}`,
        iterations: args.iterations,
        totalMs: benchResult.totalMs,
        avgMs: benchResult.avgMs,
      },
    ],
  };

  writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const mdPath = join(outputDir, `${fileBase}.md`);
  const markdown = [
    "# tool-ui source baseline benchmark",
    "",
    `- Timestamp: ${timestamp}`,
    `- Source SHA: ${args.sourceSha}`,
    `- Component: ${args.component}`,
    "- Methodology: Native source Zod contract parsing loaded from tool-ui source adapters",
    "",
    "| Benchmark | Iterations | Total | Avg / iteration |",
    "|---|---:|---:|---:|",
    `| contract.parse.${args.component} | ${args.iterations} | ${benchResult.totalMs.toFixed(2)} ms | ${benchResult.avgMs.toFixed(6)} ms |`,
    "",
  ].join("\n");

  writeFileSync(mdPath, markdown);

  console.log(`Wrote source baseline JSON: ${jsonPath}`);
  console.log(`Wrote source baseline summary: ${mdPath}`);
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  await main();
}
