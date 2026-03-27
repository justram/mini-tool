import { expect, test } from "@playwright/test";

test("chart interaction parity: tooltip appears on bar and line hover/focus", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const barChart = page.getByTestId("chart-card").locator("mini-tool-chart");
  await expect(barChart).toBeVisible();

  const barTooltip = await barChart.evaluate(async (element) => {
    const root = element.shadowRoot;
    const firstBar = root?.querySelector<SVGRectElement>(".bar");
    if (!root || !firstBar) {
      return { visible: false, text: "", style: null as null | Record<string, string> };
    }

    firstBar.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const tooltip = root.querySelector<HTMLElement>(".chart-tooltip");
    const style = tooltip
      ? {
          fontSize: window.getComputedStyle(tooltip).fontSize,
          borderRadius: window.getComputedStyle(tooltip).borderRadius,
          minWidth: window.getComputedStyle(tooltip).minWidth,
          paddingTop: window.getComputedStyle(tooltip).paddingTop,
          paddingRight: window.getComputedStyle(tooltip).paddingRight,
          paddingBottom: window.getComputedStyle(tooltip).paddingBottom,
          paddingLeft: window.getComputedStyle(tooltip).paddingLeft,
          borderTopWidth: window.getComputedStyle(tooltip).borderTopWidth,
        }
      : null;

    const text = tooltip?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const rows = tooltip
      ? Array.from(tooltip.querySelectorAll(".chart-tooltip-row")).map((row) => {
          const label = row.querySelector(".chart-tooltip-series")?.textContent?.trim() ?? "";
          const value = row.querySelector(".chart-tooltip-value")?.textContent?.trim() ?? "";
          return { label, value };
        })
      : [];
    const indicatorCount = tooltip?.querySelectorAll(".chart-tooltip-indicator").length ?? 0;
    const cursorVisible = Boolean(root.querySelector(".tooltip-cursor"));
    const visible = Boolean(tooltip);

    firstBar.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return { visible, text, rows, style, indicatorCount, cursorVisible };
  });

  expect(barTooltip.visible).toBe(true);
  expect(barTooltip.text).toContain("Jan");
  expect(barTooltip.rows).toEqual([
    { label: "Revenue", value: "4,000" },
    { label: "Expenses", value: "2,400" },
  ]);
  expect(barTooltip.style?.fontSize).toBe("12px");
  expect(barTooltip.style?.borderRadius).toBe("10px");
  expect(barTooltip.style?.minWidth).toBe("128px");
  expect(barTooltip.style?.paddingTop).toBe("6px");
  expect(barTooltip.style?.paddingRight).toBe("10px");
  expect(barTooltip.style?.paddingBottom).toBe("6px");
  expect(barTooltip.style?.paddingLeft).toBe("10px");
  expect(barTooltip.style?.borderTopWidth).toBe("1px");
  expect(barTooltip.indicatorCount).toBe(2);
  expect(barTooltip.cursorVisible).toBe(true);

  const lineChart = page.getByTestId("chart-line-card").locator("mini-tool-chart");
  await expect(lineChart).toBeVisible();

  const lineTooltip = await lineChart.evaluate(async (element) => {
    const root = element.shadowRoot;
    const firstPoint = root?.querySelector<SVGCircleElement>(".data-point");
    if (!root || !firstPoint) {
      return { visible: false, text: "" };
    }

    firstPoint.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const tooltip = root.querySelector(".chart-tooltip");
    const text = tooltip?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const visible = Boolean(tooltip);

    firstPoint.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return { visible, text };
  });

  expect(lineTooltip.visible).toBe(true);
  expect(lineTooltip.text).toContain("00:00");
  expect(lineTooltip.text).toContain("CPU %");
});

test("chart interaction parity: line series stays connected to trailing points through resize", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const lineChart = page.getByTestId("chart-line-card").locator("mini-tool-chart");
  await expect(lineChart).toBeVisible();

  const readTrailingAttachmentDelta = async (): Promise<number> => {
    return lineChart.evaluate(async (element) => {
      const root = element.shadowRoot;
      const pathNodes = Array.from(root?.querySelectorAll<SVGPathElement>(".series-line") ?? []);
      const pointNodes = Array.from(root?.querySelectorAll<SVGCircleElement>(".data-point") ?? []);

      if (!root || pathNodes.length === 0 || pointNodes.length === 0) {
        return Number.POSITIVE_INFINITY;
      }

      const trailingPoints = [...pointNodes]
        .sort(
          (left, right) =>
            Number.parseFloat(right.getAttribute("cx") ?? "0") - Number.parseFloat(left.getAttribute("cx") ?? "0"),
        )
        .slice(0, pathNodes.length);

      const distanceToPath = (circle: SVGCircleElement, path: SVGPathElement): number => {
        const cx = Number.parseFloat(circle.getAttribute("cx") ?? "0");
        const cy = Number.parseFloat(circle.getAttribute("cy") ?? "0");
        const total = path.getTotalLength();
        const samples = 240;
        let best = Number.POSITIVE_INFINITY;

        for (let index = 0; index <= samples; index += 1) {
          const point = path.getPointAtLength((total * index) / samples);
          const dx = point.x - cx;
          const dy = point.y - cy;
          const distance = Math.hypot(dx, dy);
          if (distance < best) {
            best = distance;
          }
        }

        return best;
      };

      let worstDelta = 0;
      for (const circle of trailingPoints) {
        let bestForCircle = Number.POSITIVE_INFINITY;
        for (const path of pathNodes) {
          const delta = distanceToPath(circle, path);
          if (delta < bestForCircle) {
            bestForCircle = delta;
          }
        }
        worstDelta = Math.max(worstDelta, bestForCircle);
      }

      return worstDelta;
    });
  };

  await page.waitForTimeout(900);
  const initialDelta = await readTrailingAttachmentDelta();

  await page.setViewportSize({ width: 920, height: 900 });
  await page.waitForTimeout(350);
  const narrowDelta = await readTrailingAttachmentDelta();

  await page.setViewportSize({ width: 1320, height: 900 });
  await page.waitForTimeout(350);
  const wideDelta = await readTrailingAttachmentDelta();

  expect(initialDelta).toBeLessThanOrEqual(1.25);
  expect(narrowDelta).toBeLessThanOrEqual(1.25);
  expect(wideDelta).toBeLessThanOrEqual(1.25);
});

test("stats-display interaction parity: sparkline stroke stays solid and opacity-bounded", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const statsDisplay = page.getByTestId("stats-display-card").locator("mini-tool-stats-display");
  await expect(statsDisplay).toBeVisible();

  const snapshot = await statsDisplay.evaluate((element) => {
    const root = element.shadowRoot;
    const sparkline = root?.querySelector<SVGSVGElement>(".sparkline");
    const polylines = Array.from(root?.querySelectorAll<SVGPolylineElement>(".sparkline polyline") ?? []);

    if (!root || !sparkline || polylines.length < 2) {
      return null;
    }

    const sparklineRect = sparkline.getBoundingClientRect();

    const lineMetrics = polylines.map((polyline) => {
      const style = window.getComputedStyle(polyline);
      const dasharray = style.strokeDasharray;
      const opacity = Number.parseFloat(style.strokeOpacity || polyline.getAttribute("stroke-opacity") || "0");
      const strokeWidth = Number.parseFloat(style.strokeWidth);
      return { dasharray, opacity, strokeWidth };
    });

    const allSolid = lineMetrics.every((metric) => metric.dasharray === "none");
    const opacityInBounds = lineMetrics.every((metric) => metric.opacity >= 0.12 && metric.opacity <= 0.26);
    const strokeWidthInBounds = lineMetrics.every((metric) => metric.strokeWidth >= 0.85 && metric.strokeWidth <= 1.05);

    return {
      sparklineWidth: sparklineRect.width,
      sparklineHeight: sparklineRect.height,
      lineCount: lineMetrics.length,
      allSolid,
      opacityInBounds,
      strokeWidthInBounds,
    };
  });

  expect(snapshot).not.toBeNull();
  expect(snapshot?.lineCount ?? 0).toBeGreaterThanOrEqual(2);
  expect(snapshot?.sparklineWidth ?? 0).toBeGreaterThan(0);
  expect(snapshot?.sparklineHeight ?? 0).toBeGreaterThan(0);
  expect(snapshot?.allSolid).toBe(true);
  expect(snapshot?.opacityInBounds).toBe(true);
  expect(snapshot?.strokeWidthInBounds).toBe(true);
});

test("instagram-post interaction parity: like/share tooltips appear with source-like styling", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const instagramPost = page.getByTestId("instagram-post-card").locator("mini-tool-instagram-post");
  await expect(instagramPost).toBeVisible();

  const likeTooltip = await instagramPost.evaluate(async (element) => {
    const root = element.shadowRoot;
    const likeWrap = root?.querySelector<HTMLElement>(".action-wrap:has(button[aria-label='Like'])");
    const likeButton = root?.querySelector<HTMLElement>("button[aria-label='Like']");
    if (!root || !likeWrap || !likeButton) {
      return { visible: false, text: "", style: null as null | Record<string, string>, hasArrow: false };
    }

    likeButton.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const tooltip = likeWrap.querySelector<HTMLElement>(".tooltip");
    const style = tooltip
      ? {
          fontSize: window.getComputedStyle(tooltip).fontSize,
          borderRadius: window.getComputedStyle(tooltip).borderRadius,
          paddingTop: window.getComputedStyle(tooltip).paddingTop,
          paddingRight: window.getComputedStyle(tooltip).paddingRight,
          paddingBottom: window.getComputedStyle(tooltip).paddingBottom,
          paddingLeft: window.getComputedStyle(tooltip).paddingLeft,
        }
      : null;
    const text = tooltip?.childNodes[0]?.textContent?.trim() ?? "";
    const hasArrow = Boolean(tooltip?.querySelector(".tooltip-arrow"));

    likeButton.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return { visible: Boolean(tooltip), text, style, hasArrow };
  });

  expect(likeTooltip.visible).toBe(true);
  expect(likeTooltip.text).toBe("Like");
  expect(likeTooltip.hasArrow).toBe(true);
  expect(likeTooltip.style?.fontSize).toBe("12px");
  expect(likeTooltip.style?.borderRadius).toBe("8px");
  expect(likeTooltip.style?.paddingTop).toBe("6px");
  expect(likeTooltip.style?.paddingRight).toBe("12px");
  expect(likeTooltip.style?.paddingBottom).toBe("6px");
  expect(likeTooltip.style?.paddingLeft).toBe("12px");

  const shareTooltipVisible = await instagramPost.evaluate(async (element) => {
    const root = element.shadowRoot;
    const shareWrap = root?.querySelector<HTMLElement>(".action-wrap:has(button[aria-label='Share'])");
    const shareButton = root?.querySelector<HTMLElement>("button[aria-label='Share']");
    if (!root || !shareWrap || !shareButton) {
      return false;
    }

    shareButton.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    const tooltip = shareWrap.querySelector<HTMLElement>(".tooltip");
    const text = tooltip?.childNodes[0]?.textContent?.trim() ?? "";

    shareButton.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return text === "Share";
  });

  expect(shareTooltipVisible).toBe(true);
});

test("code-block interaction parity: collapse toggle changes state label", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const codeBlock = page.getByTestId("code-block-collapsible-card").locator("mini-tool-code-block[id]");
  await expect(codeBlock).toBeVisible();

  const before = await codeBlock.evaluate((element) => {
    const root = element.shadowRoot;
    const toggle = root?.querySelector<HTMLButtonElement>(".toggle");
    if (!toggle) {
      return { hasToggle: false, text: "" };
    }

    return {
      hasToggle: true,
      text: toggle.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

  expect(before.hasToggle).toBe(true);
  expect(before.text).toContain("Show all");

  const after = await codeBlock.evaluate(async (element) => {
    const root = element.shadowRoot;
    const toggle = root?.querySelector<HTMLButtonElement>(".toggle");
    if (!toggle) {
      return "";
    }

    toggle.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    return root?.querySelector<HTMLButtonElement>(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });

  expect(after).toContain("Collapse");
});

test("code-diff interaction parity: collapse toggle and split-lane geometry stay correct", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const codeDiff = page.getByTestId("code-diff-split-card").locator("mini-tool-code-diff");
  await expect(codeDiff).toBeVisible();

  const snapshot = await codeDiff.evaluate(async (element) => {
    const root = element.shadowRoot;
    const toggle = root?.querySelector<HTMLButtonElement>(".toggle");
    const leftPane = root?.querySelector<HTMLElement>(".split-pane.left");
    const rightPane = root?.querySelector<HTMLElement>(".split-pane.right");
    const leftContent = root?.querySelector<HTMLElement>(".split-pane.left .split-pane-content");
    const rightContent = root?.querySelector<HTMLElement>(".split-pane.right .split-pane-content");

    if (!root || !toggle || !leftPane || !rightPane || !leftContent || !rightContent) {
      return null;
    }

    const parseLineNo = (value: string): number | null => {
      const parsed = Number.parseInt(value.trim(), 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const isStrictlyIncreasing = (values: number[]): boolean => {
      for (let index = 1; index < values.length; index += 1) {
        if (values[index] <= values[index - 1]) {
          return false;
        }
      }
      return true;
    };

    const readRowGeometry = () => {
      const leftRows = Array.from(leftPane.querySelectorAll<HTMLElement>(".split-pane-row"));
      const rightRows = Array.from(rightPane.querySelectorAll<HTMLElement>(".split-pane-row"));
      const pairCount = Math.min(leftRows.length, rightRows.length);

      let maxHeightDelta = 0;
      let maxEmptyPairHeightDelta = 0;
      let hasStreamAsymmetry = false;

      for (let index = 0; index < pairCount; index += 1) {
        const leftRow = leftRows[index];
        const rightRow = rightRows[index];
        const leftRect = leftRow.getBoundingClientRect();
        const rightRect = rightRow.getBoundingClientRect();

        maxHeightDelta = Math.max(maxHeightDelta, Math.abs(leftRect.height - rightRect.height));

        const leftIsEmpty = leftRow.classList.contains("empty");
        const rightIsEmpty = rightRow.classList.contains("empty");
        if (leftIsEmpty || rightIsEmpty) {
          maxEmptyPairHeightDelta = Math.max(maxEmptyPairHeightDelta, Math.abs(leftRect.height - rightRect.height));
        }

        const leftNo = parseLineNo(leftRow.querySelector<HTMLElement>(".line-no")?.textContent ?? "");
        const rightNo = parseLineNo(rightRow.querySelector<HTMLElement>(".line-no")?.textContent ?? "");

        if (leftNo === null || rightNo === null) {
          if (leftNo !== rightNo) {
            hasStreamAsymmetry = true;
          }
        } else if (leftNo !== rightNo) {
          hasStreamAsymmetry = true;
        }
      }

      const leftNumbers = leftRows
        .map((row) => parseLineNo(row.querySelector<HTMLElement>(".line-no")?.textContent ?? ""))
        .filter((value): value is number => value !== null);
      const rightNumbers = rightRows
        .map((row) => parseLineNo(row.querySelector<HTMLElement>(".line-no")?.textContent ?? ""))
        .filter((value): value is number => value !== null);

      return {
        leftRows,
        rightRows,
        maxHeightDelta,
        maxEmptyPairHeightDelta,
        hasStreamAsymmetry,
        leftNumbersIncreasing: isStrictlyIncreasing(leftNumbers),
        rightNumbersIncreasing: isStrictlyIncreasing(rightNumbers),
      };
    };

    const beforeText = toggle.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const collapsedGeometry = readRowGeometry();

    toggle.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const afterText = toggle.textContent?.replace(/\s+/g, " ").trim() ?? "";

    leftPane.scrollLeft = Math.max(0, leftPane.scrollWidth - leftPane.clientWidth);
    rightPane.scrollLeft = Math.max(0, rightPane.scrollWidth - rightPane.clientWidth);

    const expandedGeometry = readRowGeometry();

    const leftDeletionRow = leftPane.querySelector<HTMLElement>(".split-pane-row.del");
    const rightAdditionRow = rightPane.querySelector<HTMLElement>(".split-pane-row.add");

    const leftLaneRect = leftContent.getBoundingClientRect();
    const rightLaneRect = rightContent.getBoundingClientRect();
    const leftDelRect = leftDeletionRow?.getBoundingClientRect() ?? null;
    const rightAddRect = rightAdditionRow?.getBoundingClientRect() ?? null;

    return {
      beforeText,
      afterText,
      hasLeftDeletionRow: Boolean(leftDeletionRow),
      hasRightAdditionRow: Boolean(rightAdditionRow),
      leftLaneWidth: leftLaneRect.width,
      leftDeletionWidth: leftDelRect?.width ?? 0,
      rightLaneWidth: rightLaneRect.width,
      rightAdditionWidth: rightAddRect?.width ?? 0,
      leftNumbersIncreasing: expandedGeometry.leftNumbersIncreasing,
      rightNumbersIncreasing: expandedGeometry.rightNumbersIncreasing,
      hasStreamAsymmetry: expandedGeometry.hasStreamAsymmetry,
      collapsedMaxRowHeightDelta: collapsedGeometry.maxHeightDelta,
      expandedMaxRowHeightDelta: expandedGeometry.maxHeightDelta,
      collapsedMaxEmptyPairHeightDelta: collapsedGeometry.maxEmptyPairHeightDelta,
      expandedMaxEmptyPairHeightDelta: expandedGeometry.maxEmptyPairHeightDelta,
    };
  });

  expect(snapshot).not.toBeNull();
  expect(snapshot?.beforeText).toContain("Show full diff");
  expect(snapshot?.afterText).toContain("Collapse");

  expect(snapshot?.hasLeftDeletionRow).toBe(true);
  expect(snapshot?.hasRightAdditionRow).toBe(true);

  expect(Math.abs((snapshot?.leftDeletionWidth ?? 0) - (snapshot?.leftLaneWidth ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((snapshot?.rightAdditionWidth ?? 0) - (snapshot?.rightLaneWidth ?? 0))).toBeLessThanOrEqual(1);

  expect(snapshot?.leftNumbersIncreasing).toBe(true);
  expect(snapshot?.rightNumbersIncreasing).toBe(true);
  expect(snapshot?.hasStreamAsymmetry).toBe(true);

  expect(snapshot?.collapsedMaxRowHeightDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.75);
  expect(snapshot?.expandedMaxRowHeightDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.75);
  expect(snapshot?.collapsedMaxEmptyPairHeightDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.75);
  expect(snapshot?.expandedMaxEmptyPairHeightDelta ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.75);
});

test("message-draft interaction parity: send enters undo state and auto-commits receipt", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const draft = page.getByTestId("message-draft-card").locator("mini-tool-message-draft");
  await expect(draft).toBeVisible();

  const snapshot = await draft.evaluate(async (element) => {
    const root = element.shadowRoot;
    const sendButton = root?.querySelector<HTMLButtonElement>(".action-primary");
    if (!root || !sendButton) {
      return null;
    }

    sendButton.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const undoButton = root.querySelector<HTMLButtonElement>(".action-undo");
    const sendingLabel = root.querySelector(".sending-label")?.textContent?.trim() ?? "";
    const undoFocused = root.activeElement === undoButton;

    await new Promise((resolve) => setTimeout(resolve, 1400));
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const receiptText = root.querySelector("[role='status']")?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    return {
      hasUndoButton: Boolean(undoButton),
      undoFocused,
      sendingLabel,
      receiptText,
    };
  });

  expect(snapshot).not.toBeNull();
  expect(snapshot?.hasUndoButton).toBe(true);
  expect(snapshot?.undoFocused).toBe(true);
  expect(snapshot?.sendingLabel).toContain("Sending in");
  expect(snapshot?.receiptText).toContain("Sent at");
});

test("parameter-slider interaction parity: keyboard adjustment updates inline value and preserves action styling", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const slider = page.getByTestId("parameter-slider-card").locator("mini-tool-parameter-slider");
  await expect(slider).toBeVisible();

  const snapshot = await slider.evaluate(async (element) => {
    const root = element.shadowRoot;
    const firstInput = root?.querySelector<HTMLInputElement>(".slider-input");
    const valueNode = root?.querySelector<HTMLElement>(".value");
    const applyButton = root?.querySelector<HTMLButtonElement>("button[data-action-id='apply']");
    const flatButton = root?.querySelector<HTMLButtonElement>("button[data-action-id='reset']");
    const marker = root?.querySelector<HTMLElement>(".value-marker");
    const majorTick = root?.querySelector<HTMLElement>(".tick.major");
    const minorTick = root?.querySelector<HTMLElement>(".tick.minor");

    if (!root || !firstInput || !valueNode || !applyButton || !flatButton || !marker || !majorTick || !minorTick) {
      return null;
    }

    const beforeText = valueNode.textContent?.trim() ?? "";
    firstInput.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 40));

    const markerBefore = window.getComputedStyle(marker);
    const majorTickHeight = window.getComputedStyle(majorTick).height;
    const minorTickHeight = window.getComputedStyle(minorTick).height;

    const markerRectBefore = marker.getBoundingClientRect();
    const majorTicks = Array.from(root.querySelectorAll<HTMLElement>(".tick.major:not(.edge)"));
    const nearestMajorTickDeltaBefore = majorTicks.reduce((best, tick) => {
      const tickRect = tick.getBoundingClientRect();
      const markerCenterX = markerRectBefore.left + markerRectBefore.width / 2;
      const tickCenterX = tickRect.left + tickRect.width / 2;
      const delta = Math.abs(markerCenterX - tickCenterX);
      return Math.min(best, delta);
    }, Number.POSITIVE_INFINITY);

    firstInput.focus();
    firstInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    firstInput.stepUp();
    firstInput.dispatchEvent(new Event("input", { bubbles: true }));

    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 160));

    const markerAfter = window.getComputedStyle(marker);
    const markerRectAfter = marker.getBoundingClientRect();
    const nearestMajorTickDeltaAfter = majorTicks.reduce((best, tick) => {
      const tickRect = tick.getBoundingClientRect();
      const markerCenterX = markerRectAfter.left + markerRectAfter.width / 2;
      const tickCenterX = tickRect.left + tickRect.width / 2;
      const delta = Math.abs(markerCenterX - tickCenterX);
      return Math.min(best, delta);
    }, Number.POSITIVE_INFINITY);

    const afterText = root.querySelector<HTMLElement>(".value")?.textContent?.trim() ?? "";
    const applyStyles = window.getComputedStyle(applyButton);
    const flatStyles = window.getComputedStyle(flatButton);

    return {
      beforeText,
      afterText,
      activeTag: root.activeElement?.tagName ?? "",
      markerWidthBefore: markerBefore.width,
      markerWidthAfter: markerAfter.width,
      markerHeightBefore: markerBefore.height,
      markerHeightAfter: markerAfter.height,
      nearestMajorTickDeltaBefore,
      nearestMajorTickDeltaAfter,
      majorTickHeight,
      minorTickHeight,
      applyBackground: applyStyles.backgroundColor,
      applyTextColor: applyStyles.color,
      flatBackground: flatStyles.backgroundColor,
      flatBorderColor: flatStyles.borderColor,
    };
  });

  expect(snapshot).not.toBeNull();
  expect(snapshot?.beforeText).toContain("+3.0 dB");
  expect(snapshot?.afterText).toContain("+3.1 dB");
  expect(snapshot?.activeTag).toBe("INPUT");
  expect(snapshot?.majorTickHeight).toBe("8px");
  expect(snapshot?.minorTickHeight).toBe("6px");
  expect(snapshot?.nearestMajorTickDeltaBefore ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1.25);
  expect(Number.parseFloat(snapshot?.markerWidthAfter ?? "0")).toBeGreaterThanOrEqual(
    Number.parseFloat(snapshot?.markerWidthBefore ?? "0"),
  );
  expect(Number.parseFloat(snapshot?.markerHeightAfter ?? "0")).toBeGreaterThanOrEqual(
    Number.parseFloat(snapshot?.markerHeightBefore ?? "0"),
  );
  expect(Number.parseFloat(snapshot?.markerHeightAfter ?? "0")).toBeGreaterThan(
    Number.parseFloat(snapshot?.majorTickHeight ?? "0"),
  );
  expect(snapshot?.applyBackground).not.toBe(snapshot?.flatBackground);
  expect(snapshot?.applyTextColor).not.toBe(snapshot?.flatBackground);
});

test("x-post interaction parity: like/share tooltips appear with source-like styling", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const xPost = page.getByTestId("x-post-card").locator("mini-tool-x-post");
  await expect(xPost).toBeVisible();

  const likeTooltip = await xPost.evaluate(async (element) => {
    const root = element.shadowRoot;
    const likeWrap = root?.querySelector<HTMLElement>(".action-wrap:has(button[aria-label='Like'])");
    const likeButton = root?.querySelector<HTMLElement>("button[aria-label='Like']");
    if (!root || !likeWrap || !likeButton) {
      return { visible: false, text: "", style: null as null | Record<string, string>, hasArrow: false };
    }

    likeButton.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const tooltip = likeWrap.querySelector<HTMLElement>(".tooltip");
    const style = tooltip
      ? {
          fontSize: window.getComputedStyle(tooltip).fontSize,
          borderRadius: window.getComputedStyle(tooltip).borderRadius,
          paddingTop: window.getComputedStyle(tooltip).paddingTop,
          paddingRight: window.getComputedStyle(tooltip).paddingRight,
          paddingBottom: window.getComputedStyle(tooltip).paddingBottom,
          paddingLeft: window.getComputedStyle(tooltip).paddingLeft,
        }
      : null;
    const text = tooltip?.childNodes[0]?.textContent?.trim() ?? "";
    const hasArrow = Boolean(tooltip?.querySelector(".tooltip-arrow"));

    likeButton.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return { visible: Boolean(tooltip), text, style, hasArrow };
  });

  expect(likeTooltip.visible).toBe(true);
  expect(likeTooltip.text).toBe("Like");
  expect(likeTooltip.hasArrow).toBe(true);
  expect(likeTooltip.style?.fontSize).toBe("12px");
  expect(likeTooltip.style?.borderRadius).toBe("8px");
  expect(likeTooltip.style?.paddingTop).toBe("6px");
  expect(likeTooltip.style?.paddingRight).toBe("12px");
  expect(likeTooltip.style?.paddingBottom).toBe("6px");
  expect(likeTooltip.style?.paddingLeft).toBe("12px");

  const shareTooltipVisible = await xPost.evaluate(async (element) => {
    const root = element.shadowRoot;
    const shareWrap = root?.querySelector<HTMLElement>(".action-wrap:has(button[aria-label='Share'])");
    const shareButton = root?.querySelector<HTMLElement>("button[aria-label='Share']");
    if (!root || !shareWrap || !shareButton) {
      return false;
    }

    shareButton.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    const tooltip = shareWrap.querySelector<HTMLElement>(".tooltip");
    const text = tooltip?.childNodes[0]?.textContent?.trim() ?? "";

    shareButton.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return text === "Share";
  });

  expect(shareTooltipVisible).toBe(true);
});
