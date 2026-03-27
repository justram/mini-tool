import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

type PackageJson = {
  style?: string;
  files?: string[];
  exports?: Record<string, string | { default?: string; types?: string }>;
};

type NpmPackDryRunEntry = {
  files?: Array<{ path?: string }>;
};

const USAGE = [
  "Usage: npx tsx scripts/check-package-readiness.ts [--skip-build] [--help]",
  "",
  "Checks package-consumer surface and npm-pack contents:",
  "  1) dist artifacts exist for exported subpaths",
  "  2) package.json exports/files fields are release-safe",
  "  3) npm pack --dry-run includes dist/* and excludes src/*",
].join("\n");

function parseArgs(argv: string[]): { skipBuild: boolean } {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  return {
    skipBuild: argv.includes("--skip-build"),
  };
}

function fail(message: string): never {
  throw new Error(message);
}

function runBuildIfNeeded(skipBuild: boolean): void {
  if (skipBuild) {
    return;
  }

  const result = spawnSync("npm", ["run", "build"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function loadPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
}

function assertPublicStyleExport(pkg: PackageJson): void {
  if (typeof pkg.style !== "string") {
    fail("package.json#style is missing.");
  }

  if (!pkg.style.startsWith("dist/")) {
    fail(`package.json#style must point to dist/*, received '${pkg.style}'.`);
  }

  const exportStyles = pkg.exports?.["./styles"];
  if (typeof exportStyles !== "string") {
    fail("package.json#exports['./styles'] must be a string path.");
  }

  if (!exportStyles.startsWith("./dist/")) {
    fail(`package.json#exports['./styles'] must point to ./dist/*, received '${exportStyles}'.`);
  }

  const stylePath = resolve(process.cwd(), pkg.style);
  if (!existsSync(stylePath) || !statSync(stylePath).isFile()) {
    fail(`Missing style artifact: ${stylePath}`);
  }
}

function assertFilesAllowlist(pkg: PackageJson): void {
  if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
    fail("package.json#files must be present and include dist/ for publish safety.");
  }

  if (!pkg.files.includes("dist")) {
    fail("package.json#files must include 'dist'.");
  }

  if (pkg.files.some((entry) => entry.startsWith("src"))) {
    fail("package.json#files must not include src/*.");
  }
}

function assertComponentExports(pkg: PackageJson): void {
  const componentExport = pkg.exports?.["./components/*"];
  if (!componentExport || typeof componentExport !== "object") {
    fail("package.json#exports['./components/*'] must define { types, default } targets.");
  }

  const defaultTarget = componentExport.default;
  const typesTarget = componentExport.types;

  if (typeof defaultTarget !== "string" || !defaultTarget.startsWith("./dist/")) {
    fail("package.json#exports['./components/*'].default must point to ./dist/*.");
  }

  if (typeof typesTarget !== "string" || !typesTarget.startsWith("./dist/")) {
    fail("package.json#exports['./components/*'].types must point to ./dist/*.");
  }

  const componentsDir = resolve(process.cwd(), "src/mini-tool");
  const componentNames = readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const component of componentNames) {
    const jsPath = resolve(process.cwd(), `dist/mini-tool/${component}/index.js`);
    const dtsPath = resolve(process.cwd(), `dist/mini-tool/${component}/index.d.ts`);

    if (!existsSync(jsPath) || !statSync(jsPath).isFile()) {
      fail(`Missing component JS artifact for '${component}': ${jsPath}`);
    }

    if (!existsSync(dtsPath) || !statSync(dtsPath).isFile()) {
      fail(`Missing component type artifact for '${component}': ${dtsPath}`);
    }
  }
}

function runNpmPackDryRun(): string[] {
  const result = spawnSync("npm", ["pack", "--json", "--dry-run"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    fail(`npm pack --dry-run failed: ${result.stderr || result.stdout}`);
  }

  const stdout = result.stdout.trim();
  const parsed = JSON.parse(stdout) as NpmPackDryRunEntry[];
  const files = parsed[0]?.files?.map((entry) => entry.path).filter((path): path is string => Boolean(path)) ?? [];

  if (files.length === 0) {
    fail("npm pack --dry-run returned no file entries.");
  }

  return files;
}

function assertPackContents(files: string[]): void {
  const mustInclude = [
    "dist/styles/entries/mini-tool.css",
    "dist/mini-tool/parameter-slider/index.js",
    "dist/mini-tool/parameter-slider/index.d.ts",
    "package.json",
    "README.md",
  ];

  for (const expected of mustInclude) {
    if (!files.includes(expected)) {
      fail(`Pack artifact missing required file: ${expected}`);
    }
  }

  const forbiddenPrefix = "src/";
  const srcLeak = files.find((file) => file.startsWith(forbiddenPrefix));
  if (srcLeak) {
    fail(`Pack artifact must not include src/* files, found: ${srcLeak}`);
  }
}

function printSummary(fileCount: number): void {
  console.log("[package-check] PASS");
  console.log(`[package-check] verified pack file count: ${fileCount}`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  runBuildIfNeeded(options.skipBuild);

  const pkg = loadPackageJson();
  assertPublicStyleExport(pkg);
  assertFilesAllowlist(pkg);
  assertComponentExports(pkg);

  const packFiles = runNpmPackDryRun();
  assertPackContents(packFiles);
  printSummary(packFiles.length);
}

main();
