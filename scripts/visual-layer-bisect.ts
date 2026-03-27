import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Locator, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export const VISUAL_BISECT_LAYERS = ["style", "layout", "content"] as const;

export type VisualBisectLayer = (typeof VISUAL_BISECT_LAYERS)[number];

type MatchMode = "exact" | "crop-min";
type LayerTarget = "source" | "mini" | "both";

type CliOptions = {
  component: string;
  theme?: "light" | "dark";
  sourceUrl: string;
  sourceSelector: string;
  sourceIndex?: number;
  miniUrl: string;
  miniSelector: string;
  miniIndex?: number;
  layers: VisualBisectLayer[];
  applyTo: LayerTarget;
  outputDir: string;
  maxDiffPercent: number;
  pixelThreshold: number;
  viewportWidth: number;
  viewportHeight: number;
  waitMs: number;
  matchMode: MatchMode;
  forceElementWidthPx?: number;
};

type BisectVariant = {
  id: string;
  label: string;
  disabledLayer: VisualBisectLayer | null;
};

type CaptureTarget = {
  page: Page;
  url: string;
  selector: string;
  index?: number;
  outputPath: string;
  waitMs: number;
  theme?: "light" | "dark";
  forceElementWidthPx?: number;
  disabledLayer?: VisualBisectLayer;
};

type DiffResult = {
  sourceWidth: number;
  sourceHeight: number;
  miniWidth: number;
  miniHeight: number;
  comparedWidth: number;
  comparedHeight: number;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  usedCropping: boolean;
};

type VariantResult = {
  variantId: string;
  label: string;
  disabledLayer: VisualBisectLayer | null;
  sourceArtifact: string;
  miniArtifact: string;
  diffArtifact: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
  usedCropping: boolean;
};

export function parseVisualBisectLayers(rawValue: string | undefined): VisualBisectLayer[] {
  if (!rawValue) {
    return [...VISUAL_BISECT_LAYERS];
  }

  const unique = new Set<VisualBisectLayer>();
  for (const token of rawValue.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }

    if (!VISUAL_BISECT_LAYERS.includes(trimmed as VisualBisectLayer)) {
      throw new Error(`Invalid layer '${trimmed}'. Expected one of: ${VISUAL_BISECT_LAYERS.join(", ")}.`);
    }

    unique.add(trimmed as VisualBisectLayer);
  }

  if (unique.size === 0) {
    throw new Error("--layers must include at least one layer.");
  }

  return VISUAL_BISECT_LAYERS.filter((layer) => unique.has(layer));
}

export function buildVisualBisectVariants(layers: VisualBisectLayer[]): BisectVariant[] {
  return [
    {
      id: "baseline",
      label: "baseline",
      disabledLayer: null,
    },
    ...layers.map((layer) => ({
      id: `without-${layer}`,
      label: `without ${layer}`,
      disabledLayer: layer,
    })),
  ];
}

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
      "Usage: npx tsx scripts/visual-layer-bisect.ts --component <name> [--theme light|dark] --source-url <url> --source-selector <selector> [--source-index <n>] --mini-url <url> --mini-selector <selector> [--mini-index <n>] [--layers style,layout,content] [--apply-to both|source|mini] [--output-dir <dir>] [--match-mode crop-min|exact] [--max-diff-percent 6] [--pixel-threshold 0.1] [--viewport-width 1600] [--viewport-height 1200] [--wait-ms 600] [--force-element-width-px 520]",
    );
  }

  const component = args.get("component") ?? "component";
  const themeRaw = args.get("theme");
  const applyTo = (args.get("apply-to") ?? "both") as LayerTarget;
  const layers = parseVisualBisectLayers(args.get("layers"));
  const artifactsDir = resolve(process.cwd(), "docs/migrations/artifacts");
  const outputDir = resolve(
    process.cwd(),
    args.get("output-dir") ?? `${artifactsDir}/bisect-${component}-${Date.now()}`,
  );

  const maxDiffPercent = Number(args.get("max-diff-percent") ?? "6");
  const pixelThreshold = Number(args.get("pixel-threshold") ?? "0.1");
  const viewportWidth = Number(args.get("viewport-width") ?? "1600");
  const viewportHeight = Number(args.get("viewport-height") ?? "1200");
  const waitMs = Number(args.get("wait-ms") ?? "600");
  const sourceIndexRaw = args.get("source-index");
  const miniIndexRaw = args.get("mini-index");
  const forceWidthRaw = args.get("force-element-width-px");
  const matchMode = (args.get("match-mode") ?? "crop-min") as MatchMode;

  if (themeRaw !== undefined && themeRaw !== "light" && themeRaw !== "dark") {
    throw new Error("--theme must be either 'light' or 'dark' when provided.");
  }

  if (applyTo !== "both" && applyTo !== "source" && applyTo !== "mini") {
    throw new Error("--apply-to must be one of: both, source, mini.");
  }

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

  if (matchMode !== "crop-min" && matchMode !== "exact") {
    throw new Error("--match-mode must be either 'crop-min' or 'exact'.");
  }

  const sourceIndex = sourceIndexRaw === undefined ? undefined : Number(sourceIndexRaw);
  const miniIndex = miniIndexRaw === undefined ? undefined : Number(miniIndexRaw);
  const forceElementWidthPx = forceWidthRaw === undefined ? undefined : Number(forceWidthRaw);

  if (sourceIndex !== undefined && (!Number.isInteger(sourceIndex) || sourceIndex < 0)) {
    throw new Error("--source-index must be a non-negative integer when provided.");
  }

  if (miniIndex !== undefined && (!Number.isInteger(miniIndex) || miniIndex < 0)) {
    throw new Error("--mini-index must be a non-negative integer when provided.");
  }

  if (forceElementWidthPx !== undefined && (!Number.isFinite(forceElementWidthPx) || forceElementWidthPx <= 0)) {
    throw new Error("--force-element-width-px must be a positive number when provided.");
  }

  return {
    component,
    theme: themeRaw as "light" | "dark" | undefined,
    sourceUrl,
    sourceSelector,
    sourceIndex,
    miniUrl,
    miniSelector,
    miniIndex,
    layers,
    applyTo,
    outputDir,
    maxDiffPercent,
    pixelThreshold,
    viewportWidth,
    viewportHeight,
    waitMs,
    matchMode,
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

async function applyLayerMask(element: Locator, layer: VisualBisectLayer): Promise<void> {
  await element.evaluate((node, layerName) => {
    const root = node as HTMLElement;
    const scopeToken = `visual-bisect-${layerName}`;
    root.setAttribute("data-visual-bisect-scope", scopeToken);

    const styleId = `visual-bisect-style-${layerName}`;
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    const scope = `[data-visual-bisect-scope='${scopeToken}']`;
    const normalizedCss = {
      style: [
        "color: rgb(120, 120, 120) !important;",
        "background-color: transparent !important;",
        "background-image: none !important;",
        "border-color: transparent !important;",
        "outline-color: transparent !important;",
        "box-shadow: none !important;",
        "text-shadow: none !important;",
        "filter: none !important;",
        "backdrop-filter: none !important;",
        "fill: currentColor !important;",
        "stroke: currentColor !important;",
      ],
      layout: [
        "margin: 0 !important;",
        "padding: 0 !important;",
        "gap: 0 !important;",
        "row-gap: 0 !important;",
        "column-gap: 0 !important;",
        "border-radius: 0 !important;",
        "transform: none !important;",
        "inset: auto !important;",
        "top: auto !important;",
        "left: auto !important;",
        "right: auto !important;",
        "bottom: auto !important;",
      ],
      content: [
        "color: transparent !important;",
        "caret-color: transparent !important;",
        "text-shadow: none !important;",
      ],
    } satisfies Record<VisualBisectLayer, string[]>;

    const baseRule = `${scope}, ${scope} * { ${normalizedCss[layerName].join(" ")} }`;
    const contentRule =
      layerName === "content"
        ? `${scope} img, ${scope} svg, ${scope} video, ${scope} canvas, ${scope} picture, ${scope} iframe { opacity: 0 !important; visibility: hidden !important; } ${scope} *::before, ${scope} *::after { content: none !important; }`
        : "";

    style.textContent = `${baseRule} ${contentRule}`;
  }, layer);
}

async function captureElement(options: CaptureTarget): Promise<void> {
  await options.page.goto(options.url, { waitUntil: "networkidle" });

  if (options.theme) {
    await setPageTheme(options.page, options.theme);
  }

  const candidates = options.page.locator(options.selector);
  const candidateCount = await candidates.count();
  if (candidateCount === 0) {
    throw new Error(`No element matched selector '${options.selector}' at ${options.url}.`);
  }

  if (candidateCount > 1 && options.index === undefined) {
    throw new Error(
      `Selector '${options.selector}' matched ${candidateCount} elements at ${options.url}. Pass --source-index/--mini-index to pin target.`,
    );
  }

  const element = candidates.nth(options.index ?? 0);
  await element.waitFor({ state: "visible" });

  if (options.forceElementWidthPx !== undefined) {
    await element.evaluate((node, widthPx) => {
      const elementNode = node as HTMLElement;
      elementNode.style.width = `${widthPx}px`;
      elementNode.style.minWidth = `${widthPx}px`;
      elementNode.style.maxWidth = `${widthPx}px`;
      elementNode.style.boxSizing = "border-box";
    }, options.forceElementWidthPx);
  }

  if (options.disabledLayer) {
    await applyLayerMask(element, options.disabledLayer);
  }

  await element.scrollIntoViewIfNeeded();
  if (options.waitMs > 0) {
    await options.page.waitForTimeout(options.waitMs);
  }

  mkdirSync(dirname(options.outputPath), { recursive: true });
  await element.screenshot({ path: options.outputPath });
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
  matchMode: MatchMode,
): DiffResult {
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

function shouldApplyLayer(layer: VisualBisectLayer | null, target: LayerTarget, side: "source" | "mini"): boolean {
  if (!layer) {
    return false;
  }

  if (target === "both") {
    return true;
  }

  return target === side;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const variants = buildVisualBisectVariants(options.layers);
  mkdirSync(options.outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const sourcePage = await browser.newPage({
    viewport: { width: options.viewportWidth, height: options.viewportHeight },
  });
  const miniPage = await browser.newPage({
    viewport: { width: options.viewportWidth, height: options.viewportHeight },
  });

  const variantResults: VariantResult[] = [];

  try {
    for (const variant of variants) {
      const sourceArtifact = resolve(options.outputDir, `${variant.id}-source.png`);
      const miniArtifact = resolve(options.outputDir, `${variant.id}-mini.png`);
      const diffArtifact = resolve(options.outputDir, `${variant.id}-diff.png`);

      await captureElement({
        page: sourcePage,
        url: options.sourceUrl,
        selector: options.sourceSelector,
        index: options.sourceIndex,
        outputPath: sourceArtifact,
        waitMs: options.waitMs,
        theme: options.theme,
        forceElementWidthPx: options.forceElementWidthPx,
        disabledLayer: shouldApplyLayer(variant.disabledLayer, options.applyTo, "source")
          ? (variant.disabledLayer ?? undefined)
          : undefined,
      });

      await captureElement({
        page: miniPage,
        url: options.miniUrl,
        selector: options.miniSelector,
        index: options.miniIndex,
        outputPath: miniArtifact,
        waitMs: options.waitMs,
        theme: options.theme,
        forceElementWidthPx: options.forceElementWidthPx,
        disabledLayer: shouldApplyLayer(variant.disabledLayer, options.applyTo, "mini")
          ? (variant.disabledLayer ?? undefined)
          : undefined,
      });

      const diff = comparePngs(sourceArtifact, miniArtifact, diffArtifact, options.pixelThreshold, options.matchMode);

      variantResults.push({
        variantId: variant.id,
        label: variant.label,
        disabledLayer: variant.disabledLayer,
        sourceArtifact,
        miniArtifact,
        diffArtifact,
        diffPercent: Number(diff.diffPercent.toFixed(3)),
        diffPixels: diff.diffPixels,
        totalPixels: diff.totalPixels,
        usedCropping: diff.usedCropping,
      });
    }
  } finally {
    await sourcePage.close();
    await miniPage.close();
    await browser.close();
  }

  const baseline = variantResults.find((result) => result.variantId === "baseline");
  if (!baseline) {
    throw new Error("Missing baseline bisect result.");
  }

  const rankedCandidates = variantResults
    .filter((result) => result.variantId !== "baseline")
    .map((result) => ({
      ...result,
      improvementPct: Number((baseline.diffPercent - result.diffPercent).toFixed(3)),
    }))
    .sort((left, right) => right.improvementPct - left.improvementPct);

  const strongestCandidate = rankedCandidates[0] ?? null;

  const summary = {
    timestamp: new Date().toISOString(),
    component: options.component,
    theme: options.theme ?? null,
    source: {
      url: options.sourceUrl,
      selector: options.sourceSelector,
      index: options.sourceIndex ?? null,
    },
    mini: {
      url: options.miniUrl,
      selector: options.miniSelector,
      index: options.miniIndex ?? null,
    },
    bisect: {
      layers: options.layers,
      applyTo: options.applyTo,
      outputDir: options.outputDir,
      maxDiffPercent: options.maxDiffPercent,
      matchMode: options.matchMode,
      pixelThreshold: options.pixelThreshold,
      baselineDiffPercent: baseline.diffPercent,
      baselineGate: baseline.diffPercent <= options.maxDiffPercent ? "PASS" : "FAIL",
      strongestCandidate,
      variants: variantResults,
      rankedCandidates,
    },
  };

  const summaryPath = resolve(options.outputDir, "summary.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log("Visual layer bisect summary");
  console.log(`component: ${options.component}`);
  console.log(`theme: ${options.theme ?? "system"}`);
  console.log(`apply-to: ${options.applyTo}`);
  console.log(`output dir: ${options.outputDir}`);
  console.log(`baseline diff: ${baseline.diffPercent.toFixed(3)}% (threshold ${options.maxDiffPercent.toFixed(3)}%)`);

  if (strongestCandidate) {
    console.log(
      `strongest candidate: ${strongestCandidate.disabledLayer} (improvement ${strongestCandidate.improvementPct.toFixed(3)}%, diff ${strongestCandidate.diffPercent.toFixed(3)}%)`,
    );
  }

  console.log(`summary artifact: ${summaryPath}`);
}

const isEntryPoint = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  await main();
}
