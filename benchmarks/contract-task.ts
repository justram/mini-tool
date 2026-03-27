import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { getMiniParser } from "./mini-parser";
import { getSourceEquivalentParser } from "./source-contract-adapters";

type Variant = "mini" | "source";

type Args = {
  component: string;
  iterations: number;
  variant: Variant;
};

function parseArgs(argv: string[]): Args {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }

    args.set(key.slice(2), value);
    index += 1;
  }

  const component = args.get("component") ?? "link-preview";
  const iterations = Number(args.get("iterations") ?? "200000");
  const variantRaw = args.get("variant") ?? "mini";

  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error("--iterations must be a positive number.");
  }

  if (variantRaw !== "mini" && variantRaw !== "source") {
    throw new Error("--variant must be either 'mini' or 'source'.");
  }

  return {
    component,
    iterations,
    variant: variantRaw,
  };
}

function bench(iterations: number, run: () => void): { totalMs: number; avgMs: number } {
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    run();
  }

  const totalMs = performance.now() - startedAt;
  return {
    totalMs,
    avgMs: totalMs / iterations,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixturePath = resolve(process.cwd(), "benchmarks", "fixtures", `${args.component}.json`);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

  const sourceParser = getSourceEquivalentParser(args.component);
  const miniParser = await getMiniParser(args.component);

  const parser = args.variant === "mini" ? miniParser : sourceParser;

  // Warm one call so first-iteration setup/JIT does not skew the timed loop.
  parser(fixture);

  const result = bench(args.iterations, () => {
    parser(fixture);
  });

  console.log(
    JSON.stringify({
      metric: `contract.parse.${args.component}`,
      variant: args.variant,
      component: args.component,
      iterations: args.iterations,
      totalMs: result.totalMs,
      avgMs: result.avgMs,
      avgUs: result.avgMs * 1000,
    }),
  );
}

await main();
