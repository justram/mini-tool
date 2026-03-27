import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

type ActionPreset = "question-flow-complete";

type CliOptions = {
  component: string;
  theme?: "light" | "dark";
  sourceUrl: string;
  sourceSelector: string;
  sourceIndex?: number;
  sourceCaptureSelector?: string;
  sourceHoverSelector?: string;
  sourceHoverIndex?: number;
  sourceActionPreset?: ActionPreset;
  miniUrl: string;
  miniSelector: string;
  miniIndex?: number;
  miniCaptureSelector?: string;
  miniHoverSelector?: string;
  miniHoverIndex?: number;
  miniActionPreset?: ActionPreset;
  sourceOut: string;
  miniOut: string;
  diffOut: string;
  summaryOut: string;
  maxDiffPercent: number;
  pixelThreshold: number;
  viewportWidth: number;
  viewportHeight: number;
  waitMs: number;
  hoverWaitMs: number;
  matchMode: "exact" | "crop-min";
  forceElementWidthPx?: number;
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

  const sourceUrl = args.get("source-url");
  const sourceSelector = args.get("source-selector");
  const miniUrl = args.get("mini-url");
  const miniSelector = args.get("mini-selector");

  if (!sourceUrl || !sourceSelector || !miniUrl || !miniSelector) {
    throw new Error(
      "Usage: npx tsx scripts/visual-parity-workflow.ts --component <name> [--theme light|dark] --source-url <url> --source-selector <selector> [--source-index <n>] [--source-capture-selector <selector>] --mini-url <url> --mini-selector <selector> [--mini-index <n>] [--mini-capture-selector <selector>] [--source-hover-selector <selector> --source-hover-index <n>] [--mini-hover-selector <selector> --mini-hover-index <n>] [--source-action-preset question-flow-complete] [--mini-action-preset question-flow-complete] [--max-diff-percent 2] [--pixel-threshold 0.1] [--viewport-width 1600] [--viewport-height 1200] [--wait-ms 600] [--hover-wait-ms 160] [--match-mode crop-min|exact] [--force-element-width-px 520]",
    );
  }

  const component = args.get("component") ?? "component";
  const themeRaw = args.get("theme");
  const timestamp = Date.now();
  const artifactsDir = resolve(process.cwd(), "docs/migrations/artifacts");

  const sourceOut = resolve(
    process.cwd(),
    args.get("source-out") ?? `${artifactsDir}/${component}-source-${timestamp}.png`,
  );
  const miniOut = resolve(process.cwd(), args.get("mini-out") ?? `${artifactsDir}/${component}-mini-${timestamp}.png`);
  const diffOut = resolve(
    process.cwd(),
    args.get("diff-out") ?? `${artifactsDir}/comparison-${component}-${timestamp}.png`,
  );
  const summaryOut = resolve(
    process.cwd(),
    args.get("summary-out") ?? `${artifactsDir}/comparison-${component}-${timestamp}.json`,
  );

  const maxDiffPercent = Number(args.get("max-diff-percent") ?? "2");
  const pixelThreshold = Number(args.get("pixel-threshold") ?? "0.1");
  const viewportWidth = Number(args.get("viewport-width") ?? "1600");
  const viewportHeight = Number(args.get("viewport-height") ?? "1200");
  const waitMs = Number(args.get("wait-ms") ?? "600");
  const hoverWaitMs = Number(args.get("hover-wait-ms") ?? "160");
  const sourceIndexRaw = args.get("source-index");
  const miniIndexRaw = args.get("mini-index");
  const sourceHoverIndexRaw = args.get("source-hover-index");
  const miniHoverIndexRaw = args.get("mini-hover-index");
  const matchModeRaw = args.get("match-mode") ?? "crop-min";
  const forceElementWidthPxRaw = args.get("force-element-width-px");
  const sourceActionPresetRaw = args.get("source-action-preset");
  const miniActionPresetRaw = args.get("mini-action-preset");

  if (!Number.isFinite(maxDiffPercent) || maxDiffPercent < 0) {
    throw new Error("--max-diff-percent must be a non-negative number.");
  }

  if (!Number.isFinite(pixelThreshold) || pixelThreshold < 0 || pixelThreshold > 1) {
    throw new Error("--pixel-threshold must be in range [0, 1].");
  }

  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    throw new Error("--viewport-width must be a positive number.");
  }

  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("--viewport-height must be a positive number.");
  }

  if (!Number.isFinite(waitMs) || waitMs < 0) {
    throw new Error("--wait-ms must be a non-negative number.");
  }

  if (!Number.isFinite(hoverWaitMs) || hoverWaitMs < 0) {
    throw new Error("--hover-wait-ms must be a non-negative number.");
  }

  if (themeRaw !== undefined && themeRaw !== "light" && themeRaw !== "dark") {
    throw new Error("--theme must be either 'light' or 'dark' when provided.");
  }

  if (matchModeRaw !== "exact" && matchModeRaw !== "crop-min") {
    throw new Error("--match-mode must be either 'exact' or 'crop-min'.");
  }

  const forceElementWidthPx = forceElementWidthPxRaw === undefined ? undefined : Number(forceElementWidthPxRaw);
  const sourceIndex = sourceIndexRaw === undefined ? undefined : Number(sourceIndexRaw);
  const miniIndex = miniIndexRaw === undefined ? undefined : Number(miniIndexRaw);
  const sourceHoverIndex = sourceHoverIndexRaw === undefined ? undefined : Number(sourceHoverIndexRaw);
  const miniHoverIndex = miniHoverIndexRaw === undefined ? undefined : Number(miniHoverIndexRaw);

  if (forceElementWidthPx !== undefined && (!Number.isFinite(forceElementWidthPx) || forceElementWidthPx <= 0)) {
    throw new Error("--force-element-width-px must be a positive number when provided.");
  }

  if (sourceIndex !== undefined && (!Number.isInteger(sourceIndex) || sourceIndex < 0)) {
    throw new Error("--source-index must be a non-negative integer when provided.");
  }

  if (miniIndex !== undefined && (!Number.isInteger(miniIndex) || miniIndex < 0)) {
    throw new Error("--mini-index must be a non-negative integer when provided.");
  }

  if (sourceHoverIndex !== undefined && (!Number.isInteger(sourceHoverIndex) || sourceHoverIndex < 0)) {
    throw new Error("--source-hover-index must be a non-negative integer when provided.");
  }

  if (miniHoverIndex !== undefined && (!Number.isInteger(miniHoverIndex) || miniHoverIndex < 0)) {
    throw new Error("--mini-hover-index must be a non-negative integer when provided.");
  }

  const actionPresetValues: ActionPreset[] = ["question-flow-complete"];

  if (sourceActionPresetRaw !== undefined && !actionPresetValues.includes(sourceActionPresetRaw as ActionPreset)) {
    throw new Error(`--source-action-preset must be one of: ${actionPresetValues.join(", ")}`);
  }

  if (miniActionPresetRaw !== undefined && !actionPresetValues.includes(miniActionPresetRaw as ActionPreset)) {
    throw new Error(`--mini-action-preset must be one of: ${actionPresetValues.join(", ")}`);
  }

  return {
    component,
    theme: themeRaw as "light" | "dark" | undefined,
    sourceUrl,
    sourceSelector,
    sourceIndex,
    sourceCaptureSelector: args.get("source-capture-selector"),
    sourceHoverSelector: args.get("source-hover-selector"),
    sourceHoverIndex,
    sourceActionPreset: sourceActionPresetRaw as ActionPreset | undefined,
    miniUrl,
    miniSelector,
    miniIndex,
    miniCaptureSelector: args.get("mini-capture-selector"),
    miniHoverSelector: args.get("mini-hover-selector"),
    miniHoverIndex,
    miniActionPreset: miniActionPresetRaw as ActionPreset | undefined,
    sourceOut,
    miniOut,
    diffOut,
    summaryOut,
    maxDiffPercent,
    pixelThreshold,
    viewportWidth,
    viewportHeight,
    waitMs,
    hoverWaitMs,
    matchMode: matchModeRaw,
    forceElementWidthPx,
  };
}

async function setPageTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((nextTheme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextTheme);
    root.setAttribute("data-theme", nextTheme);
  }, theme);
}

async function runActionPreset(element: ReturnType<Page["locator"]>, preset: ActionPreset): Promise<void> {
  if (preset !== "question-flow-complete") {
    return;
  }

  await element.evaluate(async (node) => {
    const root = (node as HTMLElement).shadowRoot ?? node;

    for (let index = 0; index < 3; index += 1) {
      const option = root.querySelector<HTMLElement>("[role='option']:not([disabled])");
      option?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 90);
      });

      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
      const action = buttons.find((button) => {
        const label = button.textContent?.trim() ?? "";
        return (label === "Next" || label === "Complete") && !button.disabled;
      });
      action?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 340);
      });
    }
  });
}

async function captureElement(
  page: Page,
  url: string,
  selector: string,
  elementIndex: number | undefined,
  captureSelector: string | undefined,
  outputPath: string,
  waitMs: number,
  hoverSelector: string | undefined,
  hoverIndex: number | undefined,
  hoverWaitMs: number,
  actionPreset: ActionPreset | undefined,
  forceElementWidthPx?: number,
  theme?: "light" | "dark",
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });

  if (theme) {
    await setPageTheme(page, theme);
  }

  const candidates = page.locator(selector);
  const candidateCount = await candidates.count();
  if (candidateCount === 0) {
    throw new Error(`No element matched selector '${selector}' at ${url}.`);
  }

  if (candidateCount > 1 && elementIndex === undefined) {
    throw new Error(
      `Selector '${selector}' matched ${candidateCount} elements at ${url}. Pass --source-index/--mini-index to pin a canonical target.`,
    );
  }

  const element = candidates.nth(elementIndex ?? 0);
  await element.waitFor({ state: "visible" });

  const applyForcedWidth = async () => {
    if (forceElementWidthPx === undefined) {
      return;
    }

    await element.evaluate((node, widthPx) => {
      const elementNode = node as HTMLElement;
      elementNode.style.width = `${widthPx}px`;
      elementNode.style.minWidth = `${widthPx}px`;
      elementNode.style.maxWidth = `${widthPx}px`;
      elementNode.style.boxSizing = "border-box";
    }, forceElementWidthPx);
  };

  await applyForcedWidth();

  await element.evaluate((node) => {
    (node as HTMLElement).scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
  });

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  if (actionPreset) {
    await runActionPreset(element, actionPreset);
    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }
  }

  if (hoverSelector) {
    const hoverCandidates = element.locator(hoverSelector);
    const hoverCount = await hoverCandidates.count();

    if (hoverCount === 0) {
      throw new Error(`No hover target matched selector '${hoverSelector}' under '${selector}' at ${url}.`);
    }

    if (hoverCount > 1 && hoverIndex === undefined) {
      throw new Error(
        `Hover selector '${hoverSelector}' matched ${hoverCount} elements under '${selector}' at ${url}. Pass --source-hover-index/--mini-hover-index.`,
      );
    }

    const hoverTarget = hoverCandidates.nth(hoverIndex ?? 0);
    await hoverTarget.waitFor({ state: "visible" });
    await hoverTarget.hover();
    if (hoverWaitMs > 0) {
      await page.waitForTimeout(hoverWaitMs);
    }
  }

  await applyForcedWidth();

  let captureTarget = element;
  if (captureSelector) {
    const captureCandidates = element.locator(captureSelector);
    const captureCount = await captureCandidates.count();

    if (captureCount === 0) {
      throw new Error(`No capture target matched selector '${captureSelector}' under '${selector}' at ${url}.`);
    }

    if (captureCount > 1) {
      throw new Error(
        `Capture selector '${captureSelector}' matched ${captureCount} elements under '${selector}' at ${url}. Use a unique selector.`,
      );
    }

    captureTarget = captureCandidates.first();
    await captureTarget.waitFor({ state: "visible" });
  }

  const bounds = await captureTarget.boundingBox();
  if (!bounds) {
    throw new Error(`Unable to capture selector '${selector}' at ${url}: target has no bounding box.`);
  }

  const clip = {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, clip });
}

function cropPng(input: PNG, width: number, height: number): PNG {
  const output = new PNG({ width, height });
  PNG.bitblt(input, output, 0, 0, width, height, 0, 0);
  return output;
}

function comparePngs(
  sourcePath: string,
  miniPath: string,
  diffPath: string,
  pixelThreshold: number,
  matchMode: "exact" | "crop-min",
) {
  const sourcePng = PNG.sync.read(readFileSync(sourcePath));
  const miniPng = PNG.sync.read(readFileSync(miniPath));

  let sourceComparable = sourcePng;
  let miniComparable = miniPng;

  if (sourcePng.width !== miniPng.width || sourcePng.height !== miniPng.height) {
    if (matchMode === "exact") {
      throw new Error(
        [
          "Image dimensions must match for diff comparison.",
          `source: ${sourcePng.width}x${sourcePng.height} (${sourcePath})`,
          `mini:   ${miniPng.width}x${miniPng.height} (${miniPath})`,
          "Hint: pass --force-element-width-px <value> or use --match-mode crop-min.",
        ].join("\n"),
      );
    }

    const targetWidth = Math.min(sourcePng.width, miniPng.width);
    const targetHeight = Math.min(sourcePng.height, miniPng.height);
    sourceComparable = cropPng(sourcePng, targetWidth, targetHeight);
    miniComparable = cropPng(miniPng, targetWidth, targetHeight);
  }

  const diffPng = new PNG({ width: sourceComparable.width, height: sourceComparable.height });
  const diffPixels = pixelmatch(
    sourceComparable.data,
    miniComparable.data,
    diffPng.data,
    sourceComparable.width,
    sourceComparable.height,
    {
      threshold: pixelThreshold,
    },
  );

  mkdirSync(dirname(diffPath), { recursive: true });
  writeFileSync(diffPath, PNG.sync.write(diffPng));

  const totalPixels = sourceComparable.width * sourceComparable.height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  return {
    sourceWidth: sourcePng.width,
    sourceHeight: sourcePng.height,
    miniWidth: miniPng.width,
    miniHeight: miniPng.height,
    comparedWidth: sourceComparable.width,
    comparedHeight: sourceComparable.height,
    diffPixels,
    totalPixels,
    diffPercent,
    usedCropping: sourcePng.width !== miniPng.width || sourcePng.height !== miniPng.height,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const browser = await chromium.launch({ headless: true });
  try {
    const sourcePage = await browser.newPage({
      viewport: { width: options.viewportWidth, height: options.viewportHeight },
    });

    const miniPage = await browser.newPage({
      viewport: { width: options.viewportWidth, height: options.viewportHeight },
    });

    await captureElement(
      sourcePage,
      options.sourceUrl,
      options.sourceSelector,
      options.sourceIndex,
      options.sourceCaptureSelector,
      options.sourceOut,
      options.waitMs,
      options.sourceHoverSelector,
      options.sourceHoverIndex,
      options.hoverWaitMs,
      options.sourceActionPreset,
      options.forceElementWidthPx,
      options.theme,
    );

    await captureElement(
      miniPage,
      options.miniUrl,
      options.miniSelector,
      options.miniIndex,
      options.miniCaptureSelector,
      options.miniOut,
      options.waitMs,
      options.miniHoverSelector,
      options.miniHoverIndex,
      options.hoverWaitMs,
      options.miniActionPreset,
      options.forceElementWidthPx,
      options.theme,
    );

    const diff = comparePngs(
      options.sourceOut,
      options.miniOut,
      options.diffOut,
      options.pixelThreshold,
      options.matchMode,
    );
    const passed = diff.diffPercent <= options.maxDiffPercent;

    const summary = {
      timestamp: new Date().toISOString(),
      component: options.component,
      theme: options.theme ?? null,
      source: {
        url: options.sourceUrl,
        selector: options.sourceSelector,
        index: options.sourceIndex ?? null,
        captureSelector: options.sourceCaptureSelector ?? null,
        hoverSelector: options.sourceHoverSelector ?? null,
        hoverIndex: options.sourceHoverIndex ?? null,
        actionPreset: options.sourceActionPreset ?? null,
        artifact: options.sourceOut,
      },
      mini: {
        url: options.miniUrl,
        selector: options.miniSelector,
        index: options.miniIndex ?? null,
        captureSelector: options.miniCaptureSelector ?? null,
        hoverSelector: options.miniHoverSelector ?? null,
        hoverIndex: options.miniHoverIndex ?? null,
        actionPreset: options.miniActionPreset ?? null,
        artifact: options.miniOut,
      },
      diff: {
        artifact: options.diffOut,
        sourceSize: `${diff.sourceWidth}x${diff.sourceHeight}`,
        miniSize: `${diff.miniWidth}x${diff.miniHeight}`,
        comparedSize: `${diff.comparedWidth}x${diff.comparedHeight}`,
        matchMode: options.matchMode,
        usedCropping: diff.usedCropping,
        diffPixels: diff.diffPixels,
        totalPixels: diff.totalPixels,
        diffPercent: Number(diff.diffPercent.toFixed(3)),
        maxDiffPercent: options.maxDiffPercent,
        pixelThreshold: options.pixelThreshold,
        gate: passed ? "PASS" : "FAIL",
      },
    };

    mkdirSync(dirname(options.summaryOut), { recursive: true });
    writeFileSync(options.summaryOut, JSON.stringify(summary, null, 2));

    console.log("Visual parity workflow summary");
    console.log(`component: ${options.component}`);
    console.log(`theme: ${options.theme ?? "system"}`);
    console.log(`source artifact: ${options.sourceOut}`);
    console.log(`mini artifact: ${options.miniOut}`);
    console.log(`diff artifact: ${options.diffOut}`);
    console.log(`summary artifact: ${options.summaryOut}`);
    console.log(`source size: ${summary.diff.sourceSize} | mini size: ${summary.diff.miniSize}`);
    console.log(
      `compared size: ${summary.diff.comparedSize} | match mode: ${summary.diff.matchMode} | cropped: ${summary.diff.usedCropping}`,
    );
    console.log(
      `diff: ${summary.diff.diffPixels}/${summary.diff.totalPixels} (${summary.diff.diffPercent.toFixed(3)}%) | threshold ${options.maxDiffPercent.toFixed(3)}%`,
    );
    console.log(`gate: ${summary.diff.gate}`);

    if (!passed) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

await main();
