import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const USAGE = "Usage: npx tsx scripts/check-architecture-boundaries.ts";

function collectFiles(rootDir: string): string[] {
  if (!existsSync(rootDir) || !statSync(rootDir).isDirectory()) {
    return [];
  }

  const files: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }

  const projectRoot = process.cwd();
  const violations: string[] = [];

  const forbiddenSharedDir = resolve(projectRoot, "src/mini-tool/shared");
  if (existsSync(forbiddenSharedDir)) {
    const nestedFiles = collectFiles(forbiddenSharedDir);
    if (nestedFiles.length > 0) {
      violations.push(
        `Found forbidden component-local shared folder with files: ${forbiddenSharedDir}. Move shared modules to src/shared/* and keep src/mini-tool/* component-local.`,
      );
    }
  }

  const forbiddenSharedStylesDir = resolve(projectRoot, "src/shared/styles");
  if (existsSync(forbiddenSharedStylesDir)) {
    const nestedFiles = collectFiles(forbiddenSharedStylesDir);
    if (nestedFiles.length > 0) {
      violations.push(
        `Legacy internal CSS folder is still present: ${forbiddenSharedStylesDir}. Move shared CSS fragments to src/shared/css-fragments/* to avoid public/internal naming ambiguity with src/styles/*.`,
      );
    }
  }

  const requiredDirs = ["src/shared", "src/styles", "src/types", "src/shared/css-fragments"];
  for (const dir of requiredDirs) {
    const absolute = resolve(projectRoot, dir);
    if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
      violations.push(`Missing required architecture directory: ${absolute}`);
    }
  }

  const legacyPaths = [
    resolve(projectRoot, "src/shared/theme/theme-transition.ts"),
    resolve(projectRoot, "src/styles/theme-transition.css"),
  ];

  for (const legacyPath of legacyPaths) {
    if (existsSync(legacyPath)) {
      violations.push(`Legacy path still present: ${legacyPath}`);
    }
  }

  const packageJsonPath = resolve(projectRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    style?: string;
    files?: string[];
    exports?: Record<string, string | { default?: string; types?: string }>;
  };

  if (typeof packageJson.style === "string" && packageJson.style.startsWith("src/")) {
    violations.push("package.json#style must point to dist/* artifacts, not src/*.");
  }

  if (packageJson.exports && typeof packageJson.exports === "object") {
    for (const [subpath, target] of Object.entries(packageJson.exports)) {
      if (typeof target === "string" && target.includes("/src/")) {
        violations.push(`package.json#exports['${subpath}'] must not reference src/*.`);
      }

      if (target && typeof target === "object") {
        if (typeof target.default === "string" && target.default.includes("/src/")) {
          violations.push(`package.json#exports['${subpath}'].default must not reference src/*.`);
        }

        if (typeof target.types === "string" && target.types.includes("/src/")) {
          violations.push(`package.json#exports['${subpath}'].types must not reference src/*.`);
        }
      }
    }
  }

  if (!Array.isArray(packageJson.files) || !packageJson.files.includes("dist")) {
    violations.push("package.json#files must include 'dist' to enforce publish-time public API boundary.");
  }

  if (Array.isArray(packageJson.files) && packageJson.files.some((entry) => entry.startsWith("src"))) {
    violations.push("package.json#files must not include src/*.");
  }

  if (violations.length === 0) {
    return;
  }

  console.error("[architecture-check] Folder ownership boundary violations detected:");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }

  process.exit(1);
}

main();
