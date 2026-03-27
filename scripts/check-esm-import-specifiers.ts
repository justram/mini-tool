import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_DIR = process.cwd();
const SRC_DIR = resolve(ROOT_DIR, "src");
const SOURCE_EXTENSIONS = new Set([".ts"]);
const ALLOWED_NON_JS_EXTENSIONS = new Set([
  ".css",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);

export type Violation = {
  file: string;
  line: number;
  column: number;
  specifier: string;
  reason: string;
};

type ScopeRules = {
  requireJsExtensionForRelativeSourceImports: boolean;
  requireJsExtensionForMiniAliasImports: boolean;
  forbidRelativeIntoSrc: boolean;
};

export type Scope = {
  name: string;
  files: readonly string[];
  directories: readonly string[];
  rules: ScopeRules;
};

export const IMPORT_SPECIFIER_SCOPES: readonly Scope[] = [
  {
    name: "src",
    files: [],
    directories: ["src"],
    rules: {
      requireJsExtensionForRelativeSourceImports: true,
      requireJsExtensionForMiniAliasImports: true,
      forbidRelativeIntoSrc: false,
    },
  },
  {
    name: "scripts",
    files: [],
    directories: ["scripts"],
    rules: {
      requireJsExtensionForRelativeSourceImports: true,
      requireJsExtensionForMiniAliasImports: true,
      forbidRelativeIntoSrc: false,
    },
  },
  {
    name: "example",
    files: [
      "example/code-snippets.ts",
      "example/harness-config.ts",
      "example/main.ts",
      "example/register-components.ts",
      "example/variant-registry.ts",
      "example/vite.config.ts",
    ],
    directories: ["example/presets", "example/runtime"],
    rules: {
      requireJsExtensionForRelativeSourceImports: true,
      requireJsExtensionForMiniAliasImports: true,
      forbidRelativeIntoSrc: true,
    },
  },
  {
    name: "mini-runtime-fixture",
    files: ["tests/fixtures/mini-runtime-app/main.ts", "tests/fixtures/mini-runtime-app/vite.config.ts"],
    directories: [],
    rules: {
      requireJsExtensionForRelativeSourceImports: true,
      requireJsExtensionForMiniAliasImports: true,
      forbidRelativeIntoSrc: true,
    },
  },
] as const;

function toAbsolutePath(path: string): string {
  return resolve(ROOT_DIR, path);
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(extname(entry.name))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

export async function collectScopeFiles(scope: Scope): Promise<string[]> {
  const filesFromDirectories = await Promise.all(
    scope.directories.map((directoryPath) => collectTsFiles(toAbsolutePath(directoryPath))),
  );
  const directFiles = scope.files.map((filePath) => toAbsolutePath(filePath));
  return [...directFiles, ...filesFromDirectories.flat()].sort();
}

export async function collectAllTargetFiles(): Promise<string[]> {
  const filesByScope = await Promise.all(IMPORT_SPECIFIER_SCOPES.map((scope) => collectScopeFiles(scope)));
  return [...new Set(filesByScope.flat())].sort();
}

export async function collectTargetFilesByScope(): Promise<Array<{ scope: Scope; files: string[] }>> {
  return Promise.all(
    IMPORT_SPECIFIER_SCOPES.map(async (scope) => ({
      scope,
      files: await collectScopeFiles(scope),
    })),
  );
}

function getLineAndColumn(content: string, index: number): { line: number; column: number } {
  const before = content.slice(0, index);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: lines.at(-1)?.length ?? 0,
  };
}

function stripQueryAndHash(specifier: string): string {
  const queryIndex = specifier.indexOf("?");
  const hashIndex = specifier.indexOf("#");
  const end = [queryIndex, hashIndex]
    .filter((value) => value >= 0)
    .reduce<number>((min, value) => Math.min(min, value), specifier.length);

  return specifier.slice(0, end);
}

function isWithinPath(basePath: string, targetPath: string): boolean {
  const rel = relative(basePath, targetPath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function validateModuleSpecifier(
  scope: Scope,
  file: string,
  content: string,
  specifier: string,
  matchIndex: number,
): Violation | null {
  const cleanSpecifier = stripQueryAndHash(specifier);

  if (cleanSpecifier.startsWith("@mini/")) {
    if (!scope.rules.requireJsExtensionForMiniAliasImports) {
      return null;
    }

    const extension = extname(cleanSpecifier);
    if (extension === ".js" || ALLOWED_NON_JS_EXTENSIONS.has(extension)) {
      return null;
    }

    const { line, column } = getLineAndColumn(content, matchIndex);
    return {
      file: relative(ROOT_DIR, file),
      line,
      column,
      specifier,
      reason: "Alias imports from @mini must use .js specifiers for source modules.",
    };
  }

  if (!cleanSpecifier.startsWith("./") && !cleanSpecifier.startsWith("../")) {
    return null;
  }

  const resolvedPath = resolve(dirname(file), cleanSpecifier);
  if (scope.rules.forbidRelativeIntoSrc && isWithinPath(SRC_DIR, resolvedPath)) {
    const { line, column } = getLineAndColumn(content, matchIndex);
    return {
      file: relative(ROOT_DIR, file),
      line,
      column,
      specifier,
      reason: "Do not use relative imports into src/. Use @mini/* alias imports instead.",
    };
  }

  if (!scope.rules.requireJsExtensionForRelativeSourceImports) {
    return null;
  }

  const extension = extname(cleanSpecifier);
  if (extension === ".js" || ALLOWED_NON_JS_EXTENSIONS.has(extension)) {
    return null;
  }

  const { line, column } = getLineAndColumn(content, matchIndex);

  if (extension === ".ts") {
    return {
      file: relative(ROOT_DIR, file),
      line,
      column,
      specifier,
      reason: "Relative TypeScript imports must use .js specifiers.",
    };
  }

  if (extension.length === 0) {
    return {
      file: relative(ROOT_DIR, file),
      line,
      column,
      specifier,
      reason: "Relative source imports must include .js extension.",
    };
  }

  return {
    file: relative(ROOT_DIR, file),
    line,
    column,
    specifier,
    reason: `Unsupported relative import extension '${extension}'. Use .js for source modules.`,
  };
}

export function collectViolations(scope: Scope, file: string, content: string): Violation[] {
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];

  const violations: Violation[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.exec(content);
    while (match) {
      const specifier = match[1] ?? "";
      const matchIndex = (match.index ?? 0) + match[0].indexOf(specifier);
      const violation = validateModuleSpecifier(scope, file, content, specifier, matchIndex);
      if (violation) {
        violations.push(violation);
      }

      match = pattern.exec(content);
    }
  }

  return violations;
}

async function main() {
  const filesByScope = await collectTargetFilesByScope();
  const violations: Violation[] = [];

  for (const { scope, files } of filesByScope) {
    for (const file of files) {
      const content = await readFile(file, "utf8");
      violations.push(...collectViolations(scope, file, content));
    }
  }

  if (violations.length === 0) {
    console.log("check-esm-import-specifiers: OK");
    return;
  }

  console.error("check-esm-import-specifiers: found import-specifier violations\n");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column}  ${violation.reason}  (${violation.specifier})`,
    );
  }

  process.exit(1);
}

const isEntrypoint = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isEntrypoint) {
  await main();
}
