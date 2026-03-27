import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { QUALITY_MANIFEST, type QualityAction, type QualityCheck, type QualityTheme } from "./quality-manifest";

type CheckResult = {
  pass: boolean;
  details: string;
};

type QualitySummaryRecord = {
  component: string;
  theme: QualityTheme;
  checkName: string;
  checkType: QualityCheck["type"];
  phase: "before" | "after";
  status: "pass" | "fail";
  details: string;
};

function resolveRequestedComponents(): Set<string> {
  const raw = process.env.QUALITY_COMPONENTS ?? process.env.QUALITY_COMPONENT;
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

const requestedComponents = resolveRequestedComponents();
const manifest =
  requestedComponents.size === 0
    ? QUALITY_MANIFEST
    : QUALITY_MANIFEST.filter((item) => requestedComponents.has(item.component));

const summaryRecords: QualitySummaryRecord[] = [];

async function applyTheme(page: Page, theme: QualityTheme): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.evaluate((nextTheme) => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(nextTheme);
        root.setAttribute("data-theme", nextTheme);
      }, theme);
      return;
    } catch (error) {
      const isRetryable = error instanceof Error && error.message.includes("Execution context was destroyed");
      if (!isRetryable || attempt === 1) {
        throw error;
      }

      await page.waitForLoadState("domcontentloaded");
    }
  }
}

async function waitForHostUpdate(host: Locator): Promise<void> {
  await host.evaluate(async (element) => {
    const maybeLitElement = element as { updateComplete?: Promise<unknown> };
    if (maybeLitElement.updateComplete) {
      await maybeLitElement.updateComplete;
    }
  });
}

async function waitForTooltipIfPresent(host: Locator): Promise<void> {
  const hasTooltip = await host.evaluate((element) => {
    return Boolean(element.shadowRoot?.querySelector(".tooltip"));
  });

  if (!hasTooltip) {
    return;
  }

  await expect
    .poll(
      async () => {
        return host.evaluate((element) => {
          const root = element.shadowRoot;
          if (!root) {
            return 0;
          }

          return Array.from(root.querySelectorAll<HTMLElement>(".tooltip")).filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            const hiddenByDisplay = style.display === "none";
            const hiddenByVisibility = style.visibility === "hidden";
            const hiddenByOpacity = Number.parseFloat(style.opacity) <= 0.01;
            const hiddenBySize = rect.width <= 0 || rect.height <= 0;
            return !(hiddenByDisplay || hiddenByVisibility || hiddenByOpacity || hiddenBySize);
          }).length;
        });
      },
      { timeout: 1200 },
    )
    .toBeGreaterThan(0);
}

async function runAction(host: Locator, action: QualityAction): Promise<void> {
  const index = action.index ?? 0;
  const targets = host.locator(action.selector);
  const count = await targets.count();

  if (count <= index) {
    if (action.optional) {
      return;
    }

    throw new Error(`Action failed: selector '${action.selector}' missing at index ${index}`);
  }

  const target = targets.nth(index);

  if (action.type === "hover") {
    await target.hover();
  } else if (action.type === "focus") {
    await target.focus();
  } else if (action.type === "press") {
    await target.focus();
    await target.press(action.key);
  } else {
    await target.click();
  }

  await waitForHostUpdate(host);

  if (action.type === "hover" || action.type === "focus") {
    await waitForTooltipIfPresent(host);
  }
}

async function runCheck(host: Locator, check: QualityCheck): Promise<CheckResult> {
  return host.evaluate((element, definition) => {
    const root = element.shadowRoot;

    if (!root) {
      return { pass: false, details: "missing shadow root" };
    }

    const queryOne = (selector: string): HTMLElement | null => {
      return root.querySelector<HTMLElement>(selector);
    };

    const queryCount = (selector: string): number => {
      return root.querySelectorAll(selector).length;
    };

    const queryVisibleCount = (selector: string): number => {
      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const hiddenByDisplay = style.display === "none";
        const hiddenByVisibility = style.visibility === "hidden";
        const hiddenByOpacity = Number.parseFloat(style.opacity) <= 0.01;
        const hiddenBySize = rect.width <= 0 || rect.height <= 0;

        return !(hiddenByDisplay || hiddenByVisibility || hiddenByOpacity || hiddenBySize);
      }).length;
    };

    const normalizeColor = (value: string): [number, number, number] | null => {
      const trimmed = value.trim().toLowerCase();

      const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i);
      if (rgbMatch) {
        const parts = rgbMatch[1]
          .split(",")
          .slice(0, 3)
          .map((part) => Number.parseFloat(part.trim()));

        if (parts.some((part) => !Number.isFinite(part))) {
          return null;
        }

        return [parts[0], parts[1], parts[2]];
      }

      const srgbColorFunctionMatch = trimmed.match(/color\(srgb\s+([^)]+)\)/i);
      if (srgbColorFunctionMatch) {
        const channelTokens = srgbColorFunctionMatch[1]
          .split("/")[0]
          .trim()
          .split(/\s+/)
          .slice(0, 3)
          .map((token) => Number.parseFloat(token));

        if (channelTokens.every((part) => Number.isFinite(part))) {
          const channels = channelTokens.map((part) => {
            if (part <= 1) {
              return part * 255;
            }
            return part;
          });

          return [channels[0], channels[1], channels[2]];
        }
      }

      const parseOklabTriplet = (
        values: string,
      ): {
        l: number;
        a: number;
        b: number;
      } | null => {
        const [lRaw, aRaw, bRaw] = values
          .replace(/\//g, " ")
          .split(/\s+/)
          .filter((token) => token.length > 0)
          .slice(0, 3)
          .map((token) => Number.parseFloat(token));

        if (![lRaw, aRaw, bRaw].every((number) => Number.isFinite(number))) {
          return null;
        }

        return { l: lRaw, a: aRaw, b: bRaw };
      };

      const oklabMatch = trimmed.match(/oklab\(([^)]+)\)/i);
      let oklab = oklabMatch ? parseOklabTriplet(oklabMatch[1]) : null;

      const oklchMatch = trimmed.match(/oklch\(([^)]+)\)/i);
      if (!oklab && oklchMatch) {
        const [lRaw, cRaw, hRaw] = oklchMatch[1]
          .replace(/\//g, " ")
          .split(/\s+/)
          .filter((token) => token.length > 0)
          .slice(0, 3)
          .map((token) => Number.parseFloat(token));

        if ([lRaw, cRaw, hRaw].every((number) => Number.isFinite(number))) {
          const hueRad = (hRaw * Math.PI) / 180;
          oklab = {
            l: lRaw,
            a: cRaw * Math.cos(hueRad),
            b: cRaw * Math.sin(hueRad),
          };
        }
      }

      if (!oklab) {
        return null;
      }

      const lPrime = oklab.l + 0.3963377774 * oklab.a + 0.2158037573 * oklab.b;
      const mPrime = oklab.l - 0.1055613458 * oklab.a - 0.0638541728 * oklab.b;
      const sPrime = oklab.l - 0.0894841775 * oklab.a - 1.291485548 * oklab.b;

      const l = lPrime ** 3;
      const m = mPrime ** 3;
      const s = sPrime ** 3;

      const toSrgb = (linear: number): number => {
        const clamped = Math.min(1, Math.max(0, linear));
        if (clamped <= 0.0031308) {
          return clamped * 12.92;
        }
        return 1.055 * clamped ** (1 / 2.4) - 0.055;
      };

      const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

      return [toSrgb(rLinear) * 255, toSrgb(gLinear) * 255, toSrgb(bLinear) * 255];
    };

    const toLinear = (channel: number): number => {
      const normalized = channel / 255;
      if (normalized <= 0.04045) {
        return normalized / 12.92;
      }
      return ((normalized + 0.055) / 1.055) ** 2.4;
    };

    const luminance = ([r, g, b]: [number, number, number]): number => {
      const linearR = toLinear(r);
      const linearG = toLinear(g);
      const linearB = toLinear(b);
      return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
    };

    if (definition.type === "exists") {
      const count = queryCount(definition.selector);
      const minCount = definition.minCount ?? 1;
      return {
        pass: count >= minCount,
        details: `selector='${definition.selector}' count=${count} required>=${minCount}`,
      };
    }

    if (definition.type === "visible") {
      const count = queryVisibleCount(definition.selector);
      const minCount = definition.minCount ?? 1;
      return {
        pass: count >= minCount,
        details: `visible selector='${definition.selector}' count=${count} required>=${minCount}`,
      };
    }

    if (definition.type === "not-visible") {
      const count = queryVisibleCount(definition.selector);
      const maxCount = definition.maxCount ?? 0;
      return {
        pass: count <= maxCount,
        details: `visible selector='${definition.selector}' count=${count} required<=${maxCount}`,
      };
    }

    if (definition.type === "svg-namespace") {
      const svgs = Array.from(root.querySelectorAll<SVGSVGElement>(definition.selector));
      const minCount = definition.minCount ?? 1;

      if (svgs.length < minCount) {
        return {
          pass: false,
          details: `selector='${definition.selector}' count=${svgs.length} required>=${minCount}`,
        };
      }

      const svgNamespace = "http://www.w3.org/2000/svg";
      for (const svgNode of svgs) {
        const descendants = Array.from(svgNode.querySelectorAll("*"));
        for (const descendant of descendants) {
          if (descendant.namespaceURI !== svgNamespace) {
            return {
              pass: false,
              details: `selector='${definition.selector}' invalidNode='${descendant.tagName.toLowerCase()}' namespace='${descendant.namespaceURI ?? "null"}'`,
            };
          }
        }
      }

      return {
        pass: true,
        details: `selector='${definition.selector}' checked=${svgs.length}`,
      };
    }

    if (definition.type === "covers-viewport-min-ratio") {
      const overlay = queryOne(definition.selector);
      if (!overlay) {
        return {
          pass: false,
          details: `missing element for selector='${definition.selector}'`,
        };
      }

      const rect = overlay.getBoundingClientRect();
      const widthRatio = rect.width / window.innerWidth;
      const heightRatio = rect.height / window.innerHeight;

      return {
        pass: widthRatio >= definition.minWidthRatio && heightRatio >= definition.minHeightRatio,
        details: `selector='${definition.selector}' widthRatio=${widthRatio.toFixed(3)} minWidthRatio=${definition.minWidthRatio} heightRatio=${heightRatio.toFixed(3)} minHeightRatio=${definition.minHeightRatio}`,
      };
    }

    if (definition.type === "topmost-at-point-within-host") {
      let pointX = window.innerWidth / 2;
      let pointY = window.innerHeight / 2;

      if (definition.point === "selector-center") {
        if (!definition.selector) {
          return {
            pass: false,
            details: "selector-center mode requires 'selector'",
          };
        }

        const target = queryOne(definition.selector);
        if (!target) {
          return {
            pass: false,
            details: `missing element for selector='${definition.selector}'`,
          };
        }

        const rect = target.getBoundingClientRect();
        pointX = (rect.left + rect.right) / 2;
        pointY = (rect.top + rect.bottom) / 2;
      }

      const hitStack = document.elementsFromPoint(pointX, pointY);
      const top = hitStack[0] ?? null;
      const pass = Boolean(top && (top === element || element.contains(top)));
      const topClassName =
        top instanceof HTMLElement ? top.className : top instanceof SVGElement ? top.className.baseVal : "";
      const topLabel = top ? `${top.tagName.toLowerCase()}.${topClassName || "(no-class)"}` : "none";

      return {
        pass,
        details: `point=(${pointX.toFixed(1)},${pointY.toFixed(1)}) top='${topLabel}' stackDepth=${hitStack.length}`,
      };
    }

    if (definition.type === "focused") {
      const targets = Array.from(root.querySelectorAll<HTMLElement>(definition.selector));
      const activeElement = root.activeElement as HTMLElement | null;
      const pass = Boolean(activeElement && targets.some((target) => target === activeElement));

      return {
        pass,
        details: `activeElement='${activeElement?.tagName ?? "none"}' selector='${definition.selector}' candidates=${targets.length}`,
      };
    }

    if (definition.type === "style-different" || definition.type === "style-equals") {
      const elementA = queryOne(definition.selectorA);
      const elementB = queryOne(definition.selectorB);
      if (!elementA || !elementB) {
        return {
          pass: false,
          details: `missing element for selectorA='${definition.selectorA}' or selectorB='${definition.selectorB}'`,
        };
      }

      const valueA = getComputedStyle(elementA).getPropertyValue(definition.property).trim();
      const valueB = getComputedStyle(elementB).getPropertyValue(definition.property).trim();

      const pass = definition.type === "style-different" ? valueA !== valueB : valueA === valueB;
      return {
        pass,
        details: `property='${definition.property}' valueA='${valueA}' valueB='${valueB}'`,
      };
    }

    if (definition.type === "style-equals-value" || definition.type === "style-not-equals-value") {
      const element = queryOne(definition.selector);
      if (!element) {
        return {
          pass: false,
          details: `missing element for selector='${definition.selector}'`,
        };
      }

      const value = getComputedStyle(element).getPropertyValue(definition.property).trim();
      const expectedValue = definition.type === "style-equals-value" ? definition.expected : definition.forbidden;
      const pass = definition.type === "style-equals-value" ? value === expectedValue : value !== expectedValue;

      return {
        pass,
        details: `selector='${definition.selector}' property='${definition.property}' value='${value}' expected='${expectedValue}' mode='${definition.type}'`,
      };
    }

    if (definition.type === "text-contains") {
      const element = queryOne(definition.selector);
      if (!element) {
        return {
          pass: false,
          details: `missing element for selector='${definition.selector}'`,
        };
      }

      const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
      const pass = text.includes(definition.expected);
      return {
        pass,
        details: `selector='${definition.selector}' text='${text}' expectedContains='${definition.expected}'`,
      };
    }

    if (definition.type === "vertical-distance-max") {
      const elementA = queryOne(definition.selectorA);
      const elementB = queryOne(definition.selectorB);
      if (!elementA || !elementB) {
        return {
          pass: false,
          details: `missing element for selectorA='${definition.selectorA}' or selectorB='${definition.selectorB}'`,
        };
      }

      const rectA = elementA.getBoundingClientRect();
      const rectB = elementB.getBoundingClientRect();
      const pointA = definition.edgeA === "top" ? rectA.top : rectA.bottom;
      const pointB = definition.edgeB === "top" ? rectB.top : rectB.bottom;
      const deltaPx = Math.abs(pointA - pointB);

      return {
        pass: deltaPx <= definition.maxPx,
        details: `selectorA='${definition.selectorA}' edgeA='${definition.edgeA}' selectorB='${definition.selectorB}' edgeB='${definition.edgeB}' deltaPx=${deltaPx.toFixed(2)} maxPx=${definition.maxPx}`,
      };
    }

    if (definition.type === "contained-within") {
      const container = queryOne(definition.containerSelector);
      const element = queryOne(definition.elementSelector);
      if (!container || !element) {
        return {
          pass: false,
          details: `missing element for containerSelector='${definition.containerSelector}' or elementSelector='${definition.elementSelector}'`,
        };
      }

      const tolerancePx = definition.tolerancePx ?? 0;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const leftOk = elementRect.left >= containerRect.left - tolerancePx;
      const rightOk = elementRect.right <= containerRect.right + tolerancePx;
      const topOk = elementRect.top >= containerRect.top - tolerancePx;
      const bottomOk = elementRect.bottom <= containerRect.bottom + tolerancePx;
      const pass = leftOk && rightOk && topOk && bottomOk;

      return {
        pass,
        details: `container='${definition.containerSelector}' element='${definition.elementSelector}' tolerancePx=${tolerancePx} containerRect=[${containerRect.left.toFixed(2)},${containerRect.top.toFixed(2)},${containerRect.right.toFixed(2)},${containerRect.bottom.toFixed(2)}] elementRect=[${elementRect.left.toFixed(2)},${elementRect.top.toFixed(2)},${elementRect.right.toFixed(2)},${elementRect.bottom.toFixed(2)}]`,
      };
    }

    if (definition.type === "centered-within") {
      const container = queryOne(definition.containerSelector);
      const element = queryOne(definition.elementSelector);
      if (!container || !element) {
        return {
          pass: false,
          details: `missing element for containerSelector='${definition.containerSelector}' or elementSelector='${definition.elementSelector}'`,
        };
      }

      const axis = definition.axis ?? "both";
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const containerCenterX = (containerRect.left + containerRect.right) / 2;
      const containerCenterY = (containerRect.top + containerRect.bottom) / 2;
      const elementCenterX = (elementRect.left + elementRect.right) / 2;
      const elementCenterY = (elementRect.top + elementRect.bottom) / 2;

      const deltaX = Math.abs(containerCenterX - elementCenterX);
      const deltaY = Math.abs(containerCenterY - elementCenterY);

      const xOk = axis === "y" ? true : deltaX <= definition.maxDeltaPx;
      const yOk = axis === "x" ? true : deltaY <= definition.maxDeltaPx;
      const pass = xOk && yOk;

      return {
        pass,
        details: `container='${definition.containerSelector}' element='${definition.elementSelector}' axis='${axis}' deltaX=${deltaX.toFixed(2)} deltaY=${deltaY.toFixed(2)} maxDeltaPx=${definition.maxDeltaPx}`,
      };
    }

    if (definition.type === "edge-balance-max-delta") {
      const container = queryOne(definition.containerSelector);
      const element = queryOne(definition.elementSelector);
      if (!container || !element) {
        return {
          pass: false,
          details: `missing element for containerSelector='${definition.containerSelector}' or elementSelector='${definition.elementSelector}'`,
        };
      }

      const axis = definition.axis ?? "both";
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const leftGap = Math.abs(elementRect.left - containerRect.left);
      const rightGap = Math.abs(containerRect.right - elementRect.right);
      const topGap = Math.abs(elementRect.top - containerRect.top);
      const bottomGap = Math.abs(containerRect.bottom - elementRect.bottom);

      const balanceX = Math.abs(leftGap - rightGap);
      const balanceY = Math.abs(topGap - bottomGap);

      const xOk = axis === "y" ? true : balanceX <= definition.maxDeltaPx;
      const yOk = axis === "x" ? true : balanceY <= definition.maxDeltaPx;
      const pass = xOk && yOk;

      return {
        pass,
        details: `container='${definition.containerSelector}' element='${definition.elementSelector}' axis='${axis}' leftGap=${leftGap.toFixed(2)} rightGap=${rightGap.toFixed(2)} topGap=${topGap.toFixed(2)} bottomGap=${bottomGap.toFixed(2)} balanceX=${balanceX.toFixed(2)} balanceY=${balanceY.toFixed(2)} maxDeltaPx=${definition.maxDeltaPx}`,
      };
    }

    if (definition.type === "center-distance-max") {
      const elementA = queryOne(definition.selectorA);
      const elementB = queryOne(definition.selectorB);
      if (!elementA || !elementB) {
        return {
          pass: false,
          details: `missing element for selectorA='${definition.selectorA}' or selectorB='${definition.selectorB}'`,
        };
      }

      const axis = definition.axis ?? "both";
      const rectA = elementA.getBoundingClientRect();
      const rectB = elementB.getBoundingClientRect();

      const centerAX = (rectA.left + rectA.right) / 2;
      const centerAY = (rectA.top + rectA.bottom) / 2;
      const centerBX = (rectB.left + rectB.right) / 2;
      const centerBY = (rectB.top + rectB.bottom) / 2;

      const deltaX = Math.abs(centerAX - centerBX);
      const deltaY = Math.abs(centerAY - centerBY);
      const xOk = axis === "y" ? true : deltaX <= definition.maxDeltaPx;
      const yOk = axis === "x" ? true : deltaY <= definition.maxDeltaPx;

      return {
        pass: xOk && yOk,
        details: `selectorA='${definition.selectorA}' selectorB='${definition.selectorB}' axis='${axis}' deltaX=${deltaX.toFixed(2)} deltaY=${deltaY.toFixed(2)} maxDeltaPx=${definition.maxDeltaPx}`,
      };
    }

    if (definition.type === "size-delta-max") {
      const elementA = queryOne(definition.selectorA);
      const elementB = queryOne(definition.selectorB);
      if (!elementA || !elementB) {
        return {
          pass: false,
          details: `missing element for selectorA='${definition.selectorA}' or selectorB='${definition.selectorB}'`,
        };
      }

      const dimension = definition.dimension ?? "both";
      const rectA = elementA.getBoundingClientRect();
      const rectB = elementB.getBoundingClientRect();

      const deltaWidth = Math.abs(rectA.width - rectB.width);
      const deltaHeight = Math.abs(rectA.height - rectB.height);
      const widthOk = dimension === "height" ? true : deltaWidth <= definition.maxDeltaPx;
      const heightOk = dimension === "width" ? true : deltaHeight <= definition.maxDeltaPx;

      return {
        pass: widthOk && heightOk,
        details: `selectorA='${definition.selectorA}' selectorB='${definition.selectorB}' dimension='${dimension}' deltaWidth=${deltaWidth.toFixed(2)} deltaHeight=${deltaHeight.toFixed(2)} maxDeltaPx=${definition.maxDeltaPx}`,
      };
    }

    if (definition.type === "nearest-center-distance-max") {
      const element = queryOne(definition.selector);
      if (!element) {
        return {
          pass: false,
          details: `missing element for selector='${definition.selector}'`,
        };
      }

      const candidates = Array.from(root.querySelectorAll<HTMLElement>(definition.candidateSelector));
      if (candidates.length === 0) {
        return {
          pass: false,
          details: `missing candidates for candidateSelector='${definition.candidateSelector}'`,
        };
      }

      const axis = definition.axis ?? "both";
      const elementRect = element.getBoundingClientRect();
      const elementCenterX = (elementRect.left + elementRect.right) / 2;
      const elementCenterY = (elementRect.top + elementRect.bottom) / 2;

      let minDelta = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const candidateRect = candidate.getBoundingClientRect();
        const candidateCenterX = (candidateRect.left + candidateRect.right) / 2;
        const candidateCenterY = (candidateRect.top + candidateRect.bottom) / 2;

        const deltaX = Math.abs(elementCenterX - candidateCenterX);
        const deltaY = Math.abs(elementCenterY - candidateCenterY);
        const delta = axis === "x" ? deltaX : axis === "y" ? deltaY : Math.max(deltaX, deltaY);

        if (delta < minDelta) {
          minDelta = delta;
        }
      }

      return {
        pass: minDelta <= definition.maxDeltaPx,
        details: `selector='${definition.selector}' candidateSelector='${definition.candidateSelector}' axis='${axis}' nearestDelta=${minDelta.toFixed(2)} maxDeltaPx=${definition.maxDeltaPx}`,
      };
    }

    const textElement = queryOne(definition.textSelector);
    const backgroundElement = queryOne(definition.backgroundSelector);

    if (!textElement || !backgroundElement) {
      return {
        pass: false,
        details: `missing element for textSelector='${definition.textSelector}' or backgroundSelector='${definition.backgroundSelector}'`,
      };
    }

    const resolveEffectiveBackgroundColor = (candidate: HTMLElement): string => {
      let current: HTMLElement | null = candidate;

      while (current) {
        const value = getComputedStyle(current).backgroundColor.trim();
        const isTransparent = value === "transparent" || value === "rgba(0, 0, 0, 0)";

        if (!isTransparent) {
          return value;
        }

        current = current.parentElement;
      }

      const rootBackground = getComputedStyle(document.documentElement).backgroundColor.trim();
      if (rootBackground && rootBackground !== "transparent" && rootBackground !== "rgba(0, 0, 0, 0)") {
        return rootBackground;
      }

      return "rgb(255, 255, 255)";
    };

    const textColor = getComputedStyle(textElement).color;
    const backgroundColor = resolveEffectiveBackgroundColor(backgroundElement);

    const parsedText = normalizeColor(textColor);
    const parsedBackground = normalizeColor(backgroundColor);

    if (!parsedText || !parsedBackground) {
      return {
        pass: false,
        details: `unable to parse colors text='${textColor}' background='${backgroundColor}'`,
      };
    }

    const textLuminance = luminance(parsedText);
    const backgroundLuminance = luminance(parsedBackground);
    const contrastRatio =
      (Math.max(textLuminance, backgroundLuminance) + 0.05) / (Math.min(textLuminance, backgroundLuminance) + 0.05);

    return {
      pass: contrastRatio >= definition.minRatio,
      details: `contrast=${contrastRatio.toFixed(3)} min=${definition.minRatio} text='${textColor}' background='${backgroundColor}'`,
    };
  }, check);
}

for (const component of manifest) {
  test.describe(`quality gate: ${component.component}`, () => {
    for (const theme of component.themes) {
      test(`${component.component} remains usable in ${theme} mode`, async ({ page }) => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await applyTheme(page, theme);

        const host = page.locator(component.hostSelector);
        await expect(host).toBeVisible();

        for (const action of component.resetActions ?? []) {
          await runAction(host, action);
        }

        const beforeChecks = component.checks.filter((check) => check.phase === "before");
        for (const check of beforeChecks) {
          const result = await runCheck(host, check);
          summaryRecords.push({
            component: component.component,
            theme,
            checkName: check.name,
            checkType: check.type,
            phase: check.phase,
            status: result.pass ? "pass" : "fail",
            details: result.details,
          });
          expect(result.pass, `${component.component}/${theme}: ${check.name} -> ${result.details}`).toBe(true);
        }

        for (const action of component.actions ?? []) {
          await runAction(host, action);
        }

        const afterChecks = component.checks.filter((check) => check.phase === "after");
        for (const check of afterChecks) {
          const result = await runCheck(host, check);
          summaryRecords.push({
            component: component.component,
            theme,
            checkName: check.name,
            checkType: check.type,
            phase: check.phase,
            status: result.pass ? "pass" : "fail",
            details: result.details,
          });
          expect(result.pass, `${component.component}/${theme}: ${check.name} -> ${result.details}`).toBe(true);
        }
      });
    }
  });
}

test("quality gate manifest has at least one component", () => {
  expect(manifest.length).toBeGreaterThan(0);
});

test.afterAll(() => {
  const summaryOut = process.env.QUALITY_SUMMARY_OUT;
  if (!summaryOut) {
    return;
  }

  const resolvedPath = resolve(summaryOut);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const totalChecks = summaryRecords.length;
  const failedChecks = summaryRecords.filter((record) => record.status === "fail").length;

  writeFileSync(
    resolvedPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        requestedComponents: Array.from(requestedComponents),
        totalChecks,
        failedChecks,
        passedChecks: totalChecks - failedChecks,
        records: summaryRecords,
      },
      null,
      2,
    ),
  );
});
