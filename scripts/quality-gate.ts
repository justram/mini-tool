import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { MINI_TOOLUI_EXAMPLE_HARNESS_CARDS } from "../example/harness-config.js";
import { MINI_TOOLUI_EXAMPLE_CARD_VARIANTS } from "../example/variant-registry.js";
import {
  QUALITY_MANIFEST,
  QUALITY_MANIFEST_COMPONENTS,
  validateQualityManifest,
} from "../tests/e2e/quality-manifest.js";
import {
  GENERIC_ACTION_CONTROL_ICON_METHODS,
  INLINE_SVG_LITERAL_ALLOWLIST,
  PLATFORM_SEMANTIC_INLINE_SVG_METHODS,
} from "./icon-policy.js";
import {
  FIXED_POSITION_ALLOWLIST,
  HARD_CODED_COLOR_PATTERN,
  INLINE_SVG_LITERAL_PATTERN,
  LAYER_TOKEN_PREFIX,
  POSITION_FIXED_PATTERN,
  Z_INDEX_DECLARATION_PATTERN,
} from "./quality-policy.js";
import { CONTROL_SELECTOR_PATTERN } from "./typography-policy.js";

type CliOptions = {
  component?: string;
  skipContract: boolean;
  summaryOut?: string;
};

type Step = {
  name: string;
  command: string;
  run: () => number;
};

const QUALITY_GATE_USAGE =
  "Usage: npx tsx scripts/quality-gate.ts [--component <name>] [--skip-contract] [--summary-out <path>]";

function printUsage(): void {
  console.log(QUALITY_GATE_USAGE);
  console.log("\nFlags:");
  console.log("  --component <name>     Run quality checks for one component only");
  console.log("  --skip-contract        Skip contract parity unit tests");
  console.log("  --summary-out <path>   Write JSON summary to a custom path");
  console.log("  --help, -h             Show this help message");
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    if (key === "skip-contract" || key === "help") {
      args.set(key, "true");
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for '--${key}'.`);
    }

    args.set(key, value);
    index += 1;
  }

  return {
    component: args.get("component"),
    skipContract: args.get("skip-contract") === "true",
    summaryOut: args.get("summary-out"),
  };
}

function runNpmScript(scriptName: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env): number {
  const commandArgs = ["run", scriptName];
  if (args.length > 0) {
    commandArgs.push("--", ...args);
  }

  const result = spawnSync("npm", commandArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
    env,
  });

  return result.status ?? 1;
}

function runTsxScript(scriptPath: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env): number {
  const result = spawnSync("npx", ["tsx", scriptPath, ...args], {
    stdio: "inherit",
    cwd: process.cwd(),
    env,
  });

  return result.status ?? 1;
}

function runTypecheck(env: NodeJS.ProcessEnv = process.env): number {
  const result = spawnSync("npx", ["tsc", "--noEmit"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env,
  });

  return result.status ?? 1;
}

function runOxlint(paths: string[]): number {
  const result = spawnSync("npx", ["oxlint", "-c", ".oxlintrc.json", "--deny-warnings", ...paths], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  return result.status ?? 1;
}

function resolveComponentLintTargets(component: string): string[] {
  const componentDir = resolve(process.cwd(), `src/mini-tool/${component}`);
  if (!existsSync(componentDir)) {
    throw new Error(`Component lint target not found: ${componentDir}`);
  }

  return [componentDir];
}

function walkFiles(directory: string, matcher: (filePath: string) => boolean): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath, matcher));
      continue;
    }

    if (entry.isFile() && matcher(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function walkCssFiles(directory: string): string[] {
  return walkFiles(directory, (entryPath) => entryPath.endsWith(".css"));
}

function walkTsFiles(directory: string): string[] {
  return walkFiles(directory, (entryPath) => entryPath.endsWith(".ts"));
}

function runThemeTokenAudit(component: string): number {
  const componentDir = resolve(process.cwd(), `src/mini-tool/${component}`);
  if (!existsSync(componentDir) || !statSync(componentDir).isDirectory()) {
    console.error(`[quality-gate] Theme token audit target not found: ${componentDir}`);
    return 1;
  }

  const cssFiles = walkCssFiles(componentDir);
  const violations: string[] = [];

  for (const cssFile of cssFiles) {
    const content = readFileSync(cssFile, "utf8");
    const lines = content.split(/\r?\n/u);

    lines.forEach((line, index) => {
      HARD_CODED_COLOR_PATTERN.lastIndex = 0;
      if (!HARD_CODED_COLOR_PATTERN.test(line)) {
        return;
      }

      violations.push(`${relative(process.cwd(), cssFile)}:${index + 1}: ${line.trim()}`);
    });
  }

  if (violations.length === 0) {
    return 0;
  }

  console.error("[quality-gate] Hardcoded color usage detected. Use theme tokens/CSS variables instead.");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }

  return 1;
}

function normalizeTypographySelector(selector: string): string {
  return selector
    .replace(/\[[^\]]+\]/g, "")
    .replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSelectorTerminal(selector: string): string {
  const stripped = selector.replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, "").trim();
  const segments = stripped.split(/\s+|>|\+|~/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? "";
}

function runTypographyAudit(component: string): number {
  const componentDir = resolve(process.cwd(), `src/mini-tool/${component}`);
  if (!existsSync(componentDir) || !statSync(componentDir).isDirectory()) {
    console.error(`[quality-gate] Typography audit target not found: ${componentDir}`);
    return 1;
  }

  const cssFiles = walkCssFiles(componentDir);
  const violations: string[] = [];

  for (const cssFile of cssFiles) {
    const content = readFileSync(cssFile, "utf8");
    const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
    const selectorsWithFont = new Set<string>();
    const controlBlocks: Array<{ rawSelector: string; line: number; normalizedSelector: string }> = [];

    for (const match of content.matchAll(blockPattern)) {
      const selectors = match[1]?.trim() ?? "";
      const declarations = match[2] ?? "";
      if (!selectors) {
        continue;
      }

      const selectorParts = selectors
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const hasFontFamily = /\bfont-family\s*:/.test(declarations) || /\bfont\s*:/.test(declarations);

      for (const selectorPart of selectorParts) {
        const terminalSelector = resolveSelectorTerminal(selectorPart);
        if (!CONTROL_SELECTOR_PATTERN.test(terminalSelector)) {
          continue;
        }

        const normalizedSelector = normalizeTypographySelector(selectorPart);
        const blockOffset = match.index ?? 0;
        const line = content.slice(0, blockOffset).split(/\r?\n/u).length;

        controlBlocks.push({ rawSelector: selectorPart, line, normalizedSelector });

        if (hasFontFamily && normalizedSelector.length > 0) {
          selectorsWithFont.add(normalizedSelector);
        }
      }
    }

    for (const block of controlBlocks) {
      if (block.normalizedSelector.length === 0) {
        continue;
      }

      if (selectorsWithFont.has(block.normalizedSelector)) {
        continue;
      }

      violations.push(
        `${relative(process.cwd(), cssFile)}:${block.line}: selector '${block.rawSelector}' styles controls without font-family`,
      );
    }
  }

  if (violations.length === 0) {
    return 0;
  }

  console.error("[quality-gate] Typography audit failed. Control selectors must set font-family (typically inherit).");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }

  return 1;
}

type CssBlockRecord = {
  selector: string;
  declarations: string;
  line: number;
};

function parseCssBlocks(content: string): CssBlockRecord[] {
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  const blocks: CssBlockRecord[] = [];

  for (const match of content.matchAll(blockPattern)) {
    const selectors = match[1]?.trim() ?? "";
    const declarations = match[2] ?? "";
    if (!selectors) {
      continue;
    }

    const selectorParts = selectors
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    const blockOffset = match.index ?? 0;
    const line = content.slice(0, blockOffset).split(/\r?\n/u).length;

    for (const selectorPart of selectorParts) {
      blocks.push({ selector: selectorPart, declarations, line });
    }
  }

  return blocks;
}

function collectLayeringPolicyViolations(componentDir: string): string[] {
  const cssFiles = walkCssFiles(componentDir);
  const violations: string[] = [];

  for (const cssFile of cssFiles) {
    const content = readFileSync(cssFile, "utf8");
    const blocks = parseCssBlocks(content);

    for (const block of blocks) {
      const zIndexPattern = new RegExp(Z_INDEX_DECLARATION_PATTERN.source, Z_INDEX_DECLARATION_PATTERN.flags);
      const zIndexMatches = Array.from(block.declarations.matchAll(zIndexPattern));
      for (const zIndexMatch of zIndexMatches) {
        const rawValue = (zIndexMatch[1] ?? "").trim();
        const isTokenized =
          rawValue.startsWith(`var(${LAYER_TOKEN_PREFIX}`) || rawValue.startsWith(`var( ${LAYER_TOKEN_PREFIX}`);

        if (!isTokenized) {
          violations.push(
            `${relative(process.cwd(), cssFile)}:${block.line}: selector '${block.selector}' must use z-index layer token (expected var(${LAYER_TOKEN_PREFIX}...), received '${rawValue}')`,
          );
        }
      }

      const hasFixedPosition = POSITION_FIXED_PATTERN.test(block.declarations);
      if (hasFixedPosition && !FIXED_POSITION_ALLOWLIST.has(block.selector)) {
        violations.push(
          `${relative(process.cwd(), cssFile)}:${block.line}: selector '${block.selector}' uses position: fixed but is not allowlisted`,
        );
      }
    }
  }

  return violations;
}

function printLayeringPolicyViolations(violations: string[]): void {
  console.error(
    "[quality-gate] Layering policy audit failed. Use shared layering contract values and allowlisted fixed overlays only.",
  );
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
}

function runLayeringPolicyAudit(component: string): number {
  const componentDir = resolve(process.cwd(), `src/mini-tool/${component}`);
  if (!existsSync(componentDir) || !statSync(componentDir).isDirectory()) {
    console.error(`[quality-gate] Layering policy audit target not found: ${componentDir}`);
    return 1;
  }

  const violations = collectLayeringPolicyViolations(componentDir);
  if (violations.length === 0) {
    return 0;
  }

  printLayeringPolicyViolations(violations);
  return 1;
}

function runRepoLayeringPolicyAudit(): number {
  const componentRootDir = resolve(process.cwd(), "src/mini-tool");
  if (!existsSync(componentRootDir) || !statSync(componentRootDir).isDirectory()) {
    console.error(`[quality-gate] Layering policy audit target not found: ${componentRootDir}`);
    return 1;
  }

  const componentDirs = readdirSync(componentRootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(componentRootDir, entry.name));

  const extraCssAuditDirs = [resolve(process.cwd(), "example")].filter(
    (directory) => existsSync(directory) && statSync(directory).isDirectory(),
  );

  const auditDirs = [...componentDirs, ...extraCssAuditDirs];
  const violations = auditDirs.flatMap((directory) => collectLayeringPolicyViolations(directory));
  if (violations.length === 0) {
    return 0;
  }

  printLayeringPolicyViolations(violations);
  return 1;
}

function readMethodBodies(content: string, methodName: string): string[] {
  const methodPattern = new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "g");
  return Array.from(content.matchAll(methodPattern), (match) => match[1] ?? "");
}

function runNativeLucideIconAudit(component?: string): number {
  const targetDir = component
    ? resolve(process.cwd(), `src/mini-tool/${component}`)
    : resolve(process.cwd(), "src/mini-tool");

  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    console.error(`[quality-gate] Native Lucide icon audit target not found: ${targetDir}`);
    return 1;
  }

  const tsFiles = walkTsFiles(targetDir);
  const violations: string[] = [];

  for (const tsFile of tsFiles) {
    const relPath = relative(process.cwd(), tsFile);
    const content = readFileSync(tsFile, "utf8");

    const presentGenericMethods = GENERIC_ACTION_CONTROL_ICON_METHODS.filter((methodName) =>
      new RegExp(`\\b${methodName}\\s*\\(`).test(content),
    );

    if (presentGenericMethods.length > 0) {
      const hasLucideImport = /from\s+["']lucide["']/.test(content);
      const hasHelperImport = /from\s+["'][^"']*shared\/icons\/lucide["']/.test(content);
      const hasHelperUsage = /renderLucideIcon\(/.test(content);

      if (!hasLucideImport || !hasHelperImport || !hasHelperUsage) {
        violations.push(`${relPath}: generic action/control icon methods must use Lucide + renderLucideIcon helper`);
      }

      for (const methodName of presentGenericMethods) {
        const methodBodies = readMethodBodies(content, methodName);
        for (const body of methodBodies) {
          if (!/<svg\b/.test(body)) {
            continue;
          }

          violations.push(`${relPath}: ${methodName} contains inline <svg>; use renderLucideIcon(...) instead`);
        }
      }
    }

    const platformSemanticMethods = PLATFORM_SEMANTIC_INLINE_SVG_METHODS[relPath] ?? [];
    for (const methodName of platformSemanticMethods) {
      const methodBodies = readMethodBodies(content, methodName);
      for (const body of methodBodies) {
        if (!/<svg\b/.test(body)) {
          violations.push(`${relPath}: ${methodName} must keep platform-semantic inline <svg> for preview fidelity`);
          continue;
        }

        if (/renderLucideIcon\(/.test(body)) {
          violations.push(`${relPath}: ${methodName} must not use renderLucideIcon; keep platform-specific inline SVG`);
        }
      }
    }
  }

  if (violations.length === 0) {
    return 0;
  }

  console.error("[quality-gate] Native Lucide icon audit failed.");
  console.error(
    "[quality-gate] Scope: generic action/control icons must use shared Lucide; platform-semantic social/brand glyph methods must keep inline SVG for preview fidelity.",
  );
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }

  return 1;
}

function runInlineSvgLiteralAudit(component?: string): number {
  const targetDir = component
    ? resolve(process.cwd(), `src/mini-tool/${component}`)
    : resolve(process.cwd(), "src/mini-tool");

  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    console.error(`[quality-gate] Inline SVG literal audit target not found: ${targetDir}`);
    return 1;
  }

  const tsFiles = walkTsFiles(targetDir);
  const violations: string[] = [];

  for (const tsFile of tsFiles) {
    const relPath = relative(process.cwd(), tsFile);
    const content = readFileSync(tsFile, "utf8");

    if (!/<svg\b/.test(content)) {
      continue;
    }

    if (INLINE_SVG_LITERAL_ALLOWLIST.has(relPath)) {
      continue;
    }

    if (!INLINE_SVG_LITERAL_PATTERN.test(content)) {
      continue;
    }

    violations.push(
      `${relPath}: inline SVG uses literal color attributes (fill/stroke/stop-color). Move to theme tokens or add documented allowlist entry in icon policy for brand/data exceptions.`,
    );
  }

  if (violations.length === 0) {
    return 0;
  }

  console.error("[quality-gate] Inline SVG literal color audit failed.");
  console.error(
    "[quality-gate] Allowed exceptions are restricted to documented brand marks in docs/architecture/icon-policy.md.",
  );
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }

  return 1;
}

function readSmokeComponentsFromHarness(): string[] {
  return Array.from(new Set(MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.map((entry) => entry.component))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function readSmokeResetButtonComponentsFromHarness(): string[] {
  return Array.from(
    new Set(
      MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.filter((entry) => typeof entry.resetButtonId === "string").map((entry) =>
        entry.resetButtonId.slice(0, -"-reset".length),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function validateSmokeCardVariantRegistry(): string[] {
  const errors: string[] = [];
  const entriesByComponent = new Map<string, Array<{ variantId?: string }>>();

  for (const entry of MINI_TOOLUI_EXAMPLE_HARNESS_CARDS) {
    const existing = entriesByComponent.get(entry.component) ?? [];
    existing.push(entry as { variantId?: string });
    entriesByComponent.set(entry.component, existing);
  }

  for (const [componentName, entries] of entriesByComponent.entries()) {
    if (entries.length === 1) {
      const variantId = entries[0]?.variantId;
      if (typeof variantId === "string" && variantId.trim().length > 0) {
        errors.push(
          `component '${componentName}' has a single smoke card but declares variantId='${variantId}'. Remove variantId or add variant registry entry only when multiple variants exist.`,
        );
      }
      continue;
    }

    const expectedVariants = MINI_TOOLUI_EXAMPLE_CARD_VARIANTS[componentName];
    if (!expectedVariants) {
      errors.push(
        `component '${componentName}' has ${entries.length} smoke cards but no variant registry entry. Add it to example/variant-registry.ts.`,
      );
      continue;
    }

    const expectedSet = new Set(expectedVariants);
    const seen = new Set<string>();

    for (const entry of entries) {
      const variantId = entry.variantId;
      if (typeof variantId !== "string" || variantId.trim().length === 0) {
        errors.push(`component '${componentName}' has multiple smoke cards and each entry must declare variantId.`);
        continue;
      }

      if (!expectedSet.has(variantId)) {
        errors.push(
          `component '${componentName}' uses unknown variantId='${variantId}'. Allowed variants: ${expectedVariants.join(", ")}.`,
        );
      }

      if (seen.has(variantId)) {
        errors.push(`component '${componentName}' declares duplicate variantId='${variantId}' in smoke harness.`);
      }
      seen.add(variantId);
    }

    for (const variantId of expectedVariants) {
      if (!seen.has(variantId)) {
        errors.push(
          `component '${componentName}' is missing expected smoke variantId='${variantId}' from variant registry.`,
        );
      }
    }
  }

  for (const [componentName, variants] of Object.entries(MINI_TOOLUI_EXAMPLE_CARD_VARIANTS)) {
    if (!entriesByComponent.has(componentName)) {
      errors.push(
        `variant registry declares component '${componentName}' but smoke harness has no cards for it. Remove stale registry entry.`,
      );
      continue;
    }

    if (variants.length < 2) {
      errors.push(
        `variant registry entry for component '${componentName}' must include at least two variants when declared.`,
      );
    }
  }

  return errors;
}

function runCoveragePreflight(component?: string): void {
  const manifestErrors = validateQualityManifest(QUALITY_MANIFEST);
  if (manifestErrors.length > 0) {
    throw new Error(`Quality manifest validation failed:\n- ${manifestErrors.join("\n- ")}`);
  }

  const variantErrors = validateSmokeCardVariantRegistry();
  if (variantErrors.length > 0) {
    throw new Error(`Smoke harness variant integrity failed:\n- ${variantErrors.join("\n- ")}`);
  }

  const smokeComponents = readSmokeComponentsFromHarness();
  const smokeResetButtonComponents = readSmokeResetButtonComponentsFromHarness();
  const manifestComponents = new Set(QUALITY_MANIFEST_COMPONENTS);

  const uncovered = smokeComponents.filter((name) => !manifestComponents.has(name));
  if (uncovered.length > 0) {
    throw new Error(
      `Quality manifest coverage missing for smoke components: ${uncovered.join(", ")}. Add entries in tests/e2e/quality-manifest.ts before running quality gate.`,
    );
  }

  const externalResetComponents = QUALITY_MANIFEST.filter((entry) => entry.requiresExternalReset).map(
    (entry) => entry.component,
  );
  const requiredResetSet = new Set(externalResetComponents);

  const missingResetButtons = externalResetComponents.filter((name) => !smokeResetButtonComponents.includes(name));
  if (missingResetButtons.length > 0) {
    throw new Error(
      `Smoke app reset buttons missing for components with requiresExternalReset=true: ${missingResetButtons.join(", ")}. Add id="<component>-reset" in example/index.html.`,
    );
  }

  const redundantResetButtons = smokeResetButtonComponents.filter((name) => !requiredResetSet.has(name));
  if (redundantResetButtons.length > 0) {
    throw new Error(
      `Smoke app has reset buttons without requiresExternalReset=true manifest entries: ${redundantResetButtons.join(", ")}. Remove redundant reset buttons or mark components in tests/e2e/quality-manifest.ts.`,
    );
  }

  if (!component) {
    return;
  }

  if (!manifestComponents.has(component)) {
    throw new Error(
      `Component '${component}' has no quality manifest entry. Add it to tests/e2e/quality-manifest.ts before migration validation.`,
    );
  }
}

function resolveSummaryPath(options: CliOptions): string {
  if (options.summaryOut) {
    return resolve(options.summaryOut);
  }

  const artifactTimestamp = Date.now();
  const componentSuffix = options.component ?? "all";
  return resolve(process.cwd(), `docs/migrations/artifacts/quality-gate-${componentSuffix}-${artifactTimestamp}.json`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const options = parseArgs(argv);
  runCoveragePreflight(options.component);

  const summaryPath = resolveSummaryPath(options);
  const steps: Step[] = [
    {
      name: "architecture-boundary-check",
      command: "npx tsx scripts/check-architecture-boundaries.ts",
      run: () => runTsxScript("scripts/check-architecture-boundaries.ts"),
    },
  ];

  if (options.component) {
    steps.push({
      name: "component-typecheck",
      command: `npx tsx scripts/typecheck-component.ts --component ${options.component}`,
      run: () => {
        const result = spawnSync("npx", ["tsx", "scripts/typecheck-component.ts", "--component", options.component], {
          stdio: "inherit",
          cwd: process.cwd(),
          env: process.env,
        });

        return result.status ?? 1;
      },
    });

    const lintTargets = resolveComponentLintTargets(options.component);
    steps.push({
      name: "component-lint",
      command: `npx oxlint -c .oxlintrc.json --deny-warnings ${lintTargets.join(" ")}`,
      run: () => runOxlint(lintTargets),
    });

    steps.push({
      name: "component-theme-token-audit",
      command: `theme-token-audit src/mini-tool/${options.component}/**/*.css`,
      run: () => runThemeTokenAudit(options.component),
    });

    steps.push({
      name: "component-typography-audit",
      command: `typography-audit src/mini-tool/${options.component}/**/*.css`,
      run: () => runTypographyAudit(options.component),
    });

    steps.push({
      name: "component-layering-policy-audit",
      command: `layering-policy-audit src/mini-tool/${options.component}/**/*.css`,
      run: () => runLayeringPolicyAudit(options.component),
    });

    steps.push({
      name: "component-native-lucide-icon-audit",
      command: `native-lucide-icon-audit src/mini-tool/${options.component}/**/*.ts`,
      run: () => runNativeLucideIconAudit(options.component),
    });

    steps.push({
      name: "component-inline-svg-literal-audit",
      command: `inline-svg-literal-audit src/mini-tool/${options.component}/**/*.ts`,
      run: () => runInlineSvgLiteralAudit(options.component),
    });
  } else {
    steps.push({
      name: "typecheck",
      command: "tsc --noEmit",
      run: () => runTypecheck(),
    });

    steps.push({
      name: "repo-layering-policy-audit",
      command: "layering-policy-audit src/mini-tool/**/*.css",
      run: () => runRepoLayeringPolicyAudit(),
    });

    steps.push({
      name: "repo-native-lucide-icon-audit",
      command: "native-lucide-icon-audit src/mini-tool/**/*.ts",
      run: () => runNativeLucideIconAudit(),
    });

    steps.push({
      name: "repo-inline-svg-literal-audit",
      command: "inline-svg-literal-audit src/mini-tool/**/*.ts",
      run: () => runInlineSvgLiteralAudit(),
    });
  }

  if (!options.skipContract) {
    steps.push({
      name: "contract-parity",
      command: "npm run test -- tests/unit/contract-parity.test.ts",
      run: () => runNpmScript("test", ["tests/unit/contract-parity.test.ts"]),
    });
  }

  steps.push({
    name: "e2e-quality-gate",
    command:
      options.component !== undefined
        ? `QUALITY_COMPONENT=${options.component} QUALITY_SUMMARY_OUT=${summaryPath} npm run test:e2e -- tests/e2e/quality-gate.spec.ts --workers 1`
        : `QUALITY_SUMMARY_OUT=${summaryPath} npm run test:e2e -- tests/e2e/quality-gate.spec.ts --workers 1`,
    run: () =>
      runNpmScript("test:e2e", ["tests/e2e/quality-gate.spec.ts", "--workers", "1"], {
        ...process.env,
        QUALITY_SUMMARY_OUT: summaryPath,
        ...(options.component ? { QUALITY_COMPONENT: options.component } : {}),
      }),
  });

  steps.push({
    name: "e2e-responsive-layout",
    command:
      options.component !== undefined
        ? `MIGRATION_COMPONENT=${options.component} npm run test:e2e -- tests/e2e/responsive-layout.spec.ts --workers 1`
        : "npm run test:e2e -- tests/e2e/responsive-layout.spec.ts --workers 1",
    run: () =>
      runNpmScript("test:e2e", ["tests/e2e/responsive-layout.spec.ts", "--workers", "1"], {
        ...process.env,
        ...(options.component ? { MIGRATION_COMPONENT: options.component } : {}),
      }),
  });

  for (const step of steps) {
    console.log(`\n[quality-gate] ${step.name}`);
    console.log(`[quality-gate] command: ${step.command}`);

    const status = step.run();
    if (status !== 0) {
      console.log(`[quality-gate] summary artifact: ${summaryPath}`);
      process.exit(status);
    }
  }

  console.log(`[quality-gate] summary artifact: ${summaryPath}`);
  console.log("\n[quality-gate] PASS");
}

main();
