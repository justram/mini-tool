import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

type CliOptions = {
  source: string;
  mini: string;
  diffOut: string;
  maxDiffPercent: number;
  pixelThreshold: number;
};

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    args.set(key, value);
    index += 1;
  }

  const source = args.get("source");
  const mini = args.get("mini");

  if (!source || !mini) {
    throw new Error(
      "Usage: npx tsx scripts/visual-diff-gate.ts --source <source.png> --mini <mini.png> [--diff-out <diff.png>] [--max-diff-percent 2] [--pixel-threshold 0.1]",
    );
  }

  const maxDiffPercent = Number(args.get("max-diff-percent") ?? "2");
  const pixelThreshold = Number(args.get("pixel-threshold") ?? "0.1");

  if (!Number.isFinite(maxDiffPercent) || maxDiffPercent < 0) {
    throw new Error("--max-diff-percent must be a non-negative number.");
  }

  if (!Number.isFinite(pixelThreshold) || pixelThreshold < 0 || pixelThreshold > 1) {
    throw new Error("--pixel-threshold must be in range [0, 1].");
  }

  const defaultDiffOut = resolve(
    process.cwd(),
    "docs/migrations/artifacts",
    `comparison-${basename(source, ".png")}-vs-${basename(mini, ".png")}.png`,
  );

  return {
    source: resolve(process.cwd(), source),
    mini: resolve(process.cwd(), mini),
    diffOut: resolve(process.cwd(), args.get("diff-out") ?? defaultDiffOut),
    maxDiffPercent,
    pixelThreshold,
  };
}

function readPng(path: string): PNG {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }

  return PNG.sync.read(readFileSync(path));
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  const sourcePng = readPng(options.source);
  const miniPng = readPng(options.mini);

  if (sourcePng.width !== miniPng.width || sourcePng.height !== miniPng.height) {
    throw new Error(
      [
        "Image dimensions must match for diff comparison.",
        `source: ${sourcePng.width}x${sourcePng.height} (${options.source})`,
        `mini:   ${miniPng.width}x${miniPng.height} (${options.mini})`,
      ].join("\n"),
    );
  }

  const width = sourcePng.width;
  const height = sourcePng.height;
  const diffPng = new PNG({ width, height });

  const diffPixels = pixelmatch(sourcePng.data, miniPng.data, diffPng.data, width, height, {
    threshold: options.pixelThreshold,
  });

  const totalPixels = width * height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  mkdirSync(dirname(options.diffOut), { recursive: true });
  writeFileSync(options.diffOut, PNG.sync.write(diffPng));

  const summary = [
    "Visual diff gate summary",
    `source: ${options.source}`,
    `mini: ${options.mini}`,
    `diff output: ${options.diffOut}`,
    `resolution: ${width}x${height}`,
    `diff pixels: ${diffPixels}/${totalPixels}`,
    `diff percent: ${diffPercent.toFixed(3)}%`,
    `allowed max diff: ${options.maxDiffPercent.toFixed(3)}%`,
  ].join("\n");

  console.log(summary);

  if (diffPercent > options.maxDiffPercent) {
    console.error("\nVisual diff gate: FAIL");
    process.exit(1);
  }

  console.log("\nVisual diff gate: PASS");
}

main();
