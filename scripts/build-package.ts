import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const srcDir = resolve(projectRoot, "src");
const distDir = resolve(projectRoot, "dist");

const STATIC_FILE_EXTENSIONS = new Set([".css", ".js", ".mjs", ".cjs", ".json"]);

function removeDistDir(): void {
  rmSync(distDir, { recursive: true, force: true });
}

function runTypeScriptBuild(): void {
  const result = spawnSync("npx", ["tsc", "-p", "tsconfig.build.json"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function isStaticAsset(fileName: string): boolean {
  for (const extension of STATIC_FILE_EXTENSIONS) {
    if (fileName.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

function copyStaticAssets(currentDir: string): void {
  const entries = readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentDir, entry.name);

    if (entry.isDirectory()) {
      copyStaticAssets(absolutePath);
      continue;
    }

    if (!entry.isFile() || !isStaticAsset(entry.name)) {
      continue;
    }

    const relativePath = relative(srcDir, absolutePath);
    const destinationPath = resolve(distDir, relativePath);
    const destinationDir = dirname(destinationPath);

    if (!existsSync(destinationDir)) {
      mkdirSync(destinationDir, { recursive: true });
    }

    cpSync(absolutePath, destinationPath);
  }
}

function assertRequiredPaths(): void {
  const requiredFiles = [
    resolve(distDir, "styles/entries/mini-tool.css"),
    resolve(distDir, "mini-tool/parameter-slider/index.js"),
    resolve(distDir, "mini-tool/parameter-slider/index.d.ts"),
  ];

  for (const filePath of requiredFiles) {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error(`Build invariant failed. Missing expected output file: ${filePath}`);
    }
  }
}

function main(): void {
  removeDistDir();
  runTypeScriptBuild();
  copyStaticAssets(srcDir);
  assertRequiredPaths();
}

main();
