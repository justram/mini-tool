import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectTargetFilesByScope,
  IMPORT_SPECIFIER_SCOPES,
  type Scope,
  validateModuleSpecifier,
} from "../../scripts/check-esm-import-specifiers.js";

function getScope(name: string): Scope {
  const scope = IMPORT_SPECIFIER_SCOPES.find((entry) => entry.name === name);
  if (!scope) {
    throw new Error(`Missing scope: ${name}`);
  }

  return scope;
}

describe("check-esm-import-specifiers target discovery", () => {
  it("only scans explicit repo-owned paths per scope", async () => {
    const filesByScope = await collectTargetFilesByScope();
    const byScope = new Map(
      filesByScope.map(({ scope, files }) => [scope.name, files.map((file) => relative(process.cwd(), file))]),
    );

    expect(byScope.get("src")).toContain("src/actions/index.ts");
    expect(byScope.get("scripts")).toContain("scripts/check-esm-import-specifiers.ts");
    expect(byScope.get("example")).toContain("example/main.ts");
    expect(byScope.get("mini-runtime-fixture")).toContain("tests/fixtures/mini-runtime-app/main.ts");

    for (const files of byScope.values()) {
      expect(files.some((file) => file.includes("node_modules"))).toBe(false);
    }
  });
});

describe("check-esm-import-specifiers scope rules", () => {
  it("rejects extensionless relative imports in src scope", () => {
    const scope = getScope("src");
    const file = resolve(process.cwd(), "src/actions/index.ts");
    const specifier = "./classification";
    const content = `export { resolveActionKind } from "${specifier}";`;
    const matchIndex = content.indexOf(specifier);

    expect(validateModuleSpecifier(scope, file, content, specifier, matchIndex)?.reason).toBe(
      "Relative source imports must include .js extension.",
    );
  });

  it("rejects relative imports into src for example scope", () => {
    const scope = getScope("example");
    const file = resolve(process.cwd(), "example/main.ts");
    const specifier = "../src/actions/index.js";
    const content = `import { bindMiniToolActions } from "${specifier}";`;
    const matchIndex = content.indexOf(specifier);

    expect(validateModuleSpecifier(scope, file, content, specifier, matchIndex)?.reason).toBe(
      "Do not use relative imports into src/. Use @mini/* alias imports instead.",
    );
  });

  it("accepts .js alias imports for example scope", () => {
    const scope = getScope("example");
    const file = resolve(process.cwd(), "tests/fixtures/mini-runtime-app/main.ts");
    const specifier = "@mini/mini-tool/audio/audio.js";
    const content = `const loader = () => import("${specifier}");`;
    const matchIndex = content.indexOf(specifier);

    expect(validateModuleSpecifier(scope, file, content, specifier, matchIndex)).toBeNull();
  });
});
