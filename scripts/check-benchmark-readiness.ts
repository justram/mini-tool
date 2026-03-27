import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { benchmarkComponents, isBenchmarkComponent } from "../benchmarks/component-registry.js";
import { getMiniParser } from "../benchmarks/mini-parser.js";
import { getSourceEquivalentParser } from "../benchmarks/source-contract-adapters.js";

type Options = {
  components: string[];
  checkHyperfine: boolean;
};

type CheckResult = {
  component: string;
  fixtureToSource: "PASS" | "FAIL";
  sourceToMiniSuperset: "PASS" | "FAIL";
  fixtureToMini: "PASS" | "FAIL";
  error?: string;
};

const USAGE = [
  "Usage: npx tsx scripts/check-benchmark-readiness.ts [--component <name>] [--no-hyperfine-check] [--help]",
  "",
  "Options:",
  "  --component <name>         Check only one component (default: all benchmark components)",
  "  --no-hyperfine-check       Skip checking hyperfine availability",
  "  --help                     Show this help",
].join("\n");

function parseArgs(argv: string[]): Options {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  const components: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token !== "--component") {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("--component requires a value.");
    }

    if (!isBenchmarkComponent(value)) {
      throw new Error(`Unsupported component '${value}'. Supported: ${benchmarkComponents.join(", ")}`);
    }

    components.push(value);
    index += 1;
  }

  return {
    components: components.length > 0 ? components : benchmarkComponents.slice(),
    checkHyperfine: !argv.includes("--no-hyperfine-check"),
  };
}

function checkHyperfineAvailable(): void {
  const result = spawnSync("hyperfine", ["--version"], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("hyperfine is not available. Install it before running benchmark:compare.");
  }
}

function loadFixture(component: string): unknown {
  const fixturePath = resolve(process.cwd(), "benchmarks", "fixtures", `${component}.json`);
  return JSON.parse(readFileSync(fixturePath, "utf8"));
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function checkComponent(component: string): Promise<CheckResult> {
  const fixture = loadFixture(component);
  const sourceParser = getSourceEquivalentParser(component);
  const miniParser = await getMiniParser(component);

  try {
    const sourceParsed = sourceParser(fixture);

    try {
      miniParser(sourceParsed);
    } catch (error) {
      return {
        component,
        fixtureToSource: "PASS",
        sourceToMiniSuperset: "FAIL",
        fixtureToMini: "FAIL",
        error: `mini parser rejected source-valid payload: ${normalizeError(error)}`,
      };
    }

    try {
      miniParser(fixture);
    } catch (error) {
      return {
        component,
        fixtureToSource: "PASS",
        sourceToMiniSuperset: "PASS",
        fixtureToMini: "FAIL",
        error: `mini parser rejected benchmark fixture: ${normalizeError(error)}`,
      };
    }

    return {
      component,
      fixtureToSource: "PASS",
      sourceToMiniSuperset: "PASS",
      fixtureToMini: "PASS",
    };
  } catch (error) {
    return {
      component,
      fixtureToSource: "FAIL",
      sourceToMiniSuperset: "FAIL",
      fixtureToMini: "FAIL",
      error: `source parser rejected benchmark fixture: ${normalizeError(error)}`,
    };
  }
}

function printResults(results: CheckResult[]): void {
  console.log("\nBenchmark readiness (fixture + parser parity)\n");
  console.log("component | fixture->source | source->mini(superset) | fixture->mini");
  console.log("---|---|---|---");

  for (const result of results) {
    console.log(
      `${result.component} | ${result.fixtureToSource} | ${result.sourceToMiniSuperset} | ${result.fixtureToMini}`,
    );

    if (result.error) {
      console.log(`  error: ${result.error}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.checkHyperfine) {
    checkHyperfineAvailable();
  }

  const results: CheckResult[] = [];
  for (const component of options.components) {
    results.push(await checkComponent(component));
  }

  printResults(results);

  const failures = results.filter(
    (result) =>
      result.fixtureToSource === "FAIL" || result.sourceToMiniSuperset === "FAIL" || result.fixtureToMini === "FAIL",
  );

  if (failures.length > 0) {
    throw new Error(`Benchmark readiness failed for ${failures.length} component(s).`);
  }

  console.log(`\nPASS: benchmark readiness checks passed for ${results.length} component(s).`);
}

await main();
