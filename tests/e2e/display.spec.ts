import { expect, type Page, test } from "@playwright/test";

async function evaluateLocatorWithRetry<T>(
  page: Page,
  selector: string,
  evaluator: (element: Element) => T | Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.locator(selector).evaluate(evaluator);
    } catch (error) {
      const isRetryable = error instanceof Error && error.message.includes("Execution context was destroyed");
      if (!isRetryable || attempt === 1) {
        throw error;
      }

      await page.waitForLoadState("domcontentloaded");
    }
  }

  throw new Error(`Unable to evaluate locator '${selector}'.`);
}

test("renders link preview smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("link-preview-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-link-preview").evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent ?? "";
  });

  expect(title).toBe("A brief history of computing hardware");
});

test("renders image smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("image-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-image").evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent ?? "";
  });

  expect(title).toBe("From mainframes to microchips");
});

test("renders audio smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("audio-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-audio").evaluate((element) => {
    return (
      element.shadowRoot?.querySelector(".title")?.textContent ??
      element.shadowRoot?.querySelector(".compact-title")?.textContent ??
      ""
    );
  });

  expect(title).toBe("Morning Forest");

  const audioLayout = await page.locator("mini-tool-audio").evaluate((element) => {
    const root = element.shadowRoot;
    const content = root?.querySelector<HTMLElement>(".full-content");
    const controlsRow = root?.querySelector<HTMLElement>(".controls-row");
    const button = root?.querySelector<HTMLElement>(".play-toggle");

    if (!content || !controlsRow || !button) {
      return null;
    }

    const contentStyle = window.getComputedStyle(content);
    const controlsStyle = window.getComputedStyle(controlsRow);
    const buttonStyle = window.getComputedStyle(button);

    return {
      contentPaddingTop: contentStyle.paddingTop,
      controlsGap: controlsStyle.gap,
      buttonWidth: buttonStyle.width,
      buttonHeight: buttonStyle.height,
      buttonRadius: buttonStyle.borderRadius,
      buttonBackground: buttonStyle.backgroundColor,
    };
  });

  expect(audioLayout).not.toBeNull();
  expect(audioLayout?.contentPaddingTop).toBe("16px");
  expect(audioLayout?.controlsGap).toBe("12px");
  expect(audioLayout?.buttonWidth).toBe("40px");
  expect(audioLayout?.buttonHeight).toBe("40px");
  expect(audioLayout?.buttonRadius).toBe("999px");
  expect(audioLayout?.buttonBackground).not.toBe("rgba(0, 0, 0, 0)");
});

test("renders video smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("video-card");
  await expect(card).toBeVisible();

  const videoState = await page.locator("mini-tool-video").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const description = root?.querySelector(".description")?.textContent?.trim() ?? "";
    const source = root?.querySelector(".meta-row span")?.textContent?.trim() ?? "";
    const video = root?.querySelector("video");

    return {
      title,
      description,
      source,
      hasControls: Boolean(video?.controls),
      poster: video?.getAttribute("poster") ?? "",
    };
  });

  expect(videoState.title).toBe("Forest Canopy");
  expect(videoState.description).toContain("Sunlight filtering through the trees");
  expect(videoState.source).toBe("Archive.org");
  expect(videoState.hasControls).toBe(true);
  expect(videoState.poster).toContain("images.unsplash.com");
});

test("renders citation smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("citation-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-citation").evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent ?? "";
  });

  expect(title).toBe("GPT-4 Technical Report");
});

test("renders citation-list stacked smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("citation-list-card");
  await expect(card).toBeVisible();

  const countLabel = await evaluateLocatorWithRetry(page, "mini-tool-citation-list", (element) => {
    return element.shadowRoot?.querySelector(".sources-count")?.textContent ?? "";
  });

  expect(countLabel).toBe("6 sources");
});

test("renders progress-tracker smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("progress-tracker-card");
  await expect(card).toBeVisible();

  const firstLabel = await page.locator("mini-tool-progress-tracker").evaluate((element) => {
    return element.shadowRoot?.querySelector(".label")?.textContent ?? "";
  });

  expect(firstLabel).toBe("Building");

  const spinnerAnimationName = await page.locator("mini-tool-progress-tracker").evaluate((element) => {
    const spinner = element.shadowRoot?.querySelector(".spinner");
    if (!spinner) {
      return "none";
    }

    return window.getComputedStyle(spinner).animationName;
  });

  expect(spinnerAnimationName).not.toBe("none");
});

test("renders approval-card smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("approval-card-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-approval-card").evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent ?? "";
  });

  expect(title).toBe("Send Email Campaign");
});

test("renders order-summary smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("order-summary-card");
  await expect(card).toBeVisible();

  const title = await page.locator("mini-tool-order-summary").evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent?.trim() ?? "";
  });

  expect(title).toBe("Order Summary");
});

test("renders data-table smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("data-table-card");
  await expect(card).toBeVisible();

  const table = card.locator("mini-tool-data-table");
  await expect(table).toBeVisible();

  const snapshot = await table.evaluate((element) => {
    const root = element.shadowRoot;
    const heading = root?.querySelector("tbody tr:first-child td:first-child")?.textContent?.trim() ?? "";
    const headerCount = root?.querySelectorAll("thead th").length ?? 0;
    const rowCount = root?.querySelectorAll("tbody tr").length ?? 0;
    return { heading, headerCount, rowCount };
  });

  expect(snapshot.heading).toBe("IBM");
  expect(snapshot.headerCount).toBe(6);
  expect(snapshot.rowCount).toBe(5);
});

test("renders stats-display smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("stats-display-card");
  await expect(card).toBeVisible();

  const title = await evaluateLocatorWithRetry(page, "mini-tool-stats-display", (element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent?.trim() ?? "";
  });

  expect(title).toBe("Q4 Performance");

  const statCount = await evaluateLocatorWithRetry(page, "mini-tool-stats-display", (element) => {
    return element.shadowRoot?.querySelectorAll(".stat-card").length ?? 0;
  });

  expect(statCount).toBe(4);
});

test("renders chart smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const barCard = page.getByTestId("chart-card");
  await expect(barCard).toBeVisible();

  const barChart = barCard.locator("mini-tool-chart");
  const title = await barChart.evaluate((element) => {
    return element.shadowRoot?.querySelector(".title")?.textContent?.trim() ?? "";
  });

  expect(title).toBe("Monthly Revenue");

  const geometry = await barChart.evaluate((element) => {
    const root = element.shadowRoot;
    const bars = root?.querySelectorAll<SVGRectElement>(".bar") ?? [];
    const legend = root?.querySelectorAll(".legend-item") ?? [];
    const grid = root?.querySelectorAll(".grid-line") ?? [];
    const firstBar = bars[0] ?? null;
    const firstGrid = grid[0] ?? null;

    let firstBarAnimationName = "none";
    let firstBarAnimationDuration = "0s";
    if (firstBar) {
      const style = window.getComputedStyle(firstBar);
      firstBarAnimationName = style.animationName;
      firstBarAnimationDuration = style.animationDuration;
    }

    return {
      barCount: bars.length,
      legendCount: legend.length,
      gridCount: grid.length,
      firstBarNamespace: firstBar?.namespaceURI ?? null,
      firstGridNamespace: firstGrid?.namespaceURI ?? null,
      firstBarAnimationName,
      firstBarAnimationDuration,
    };
  });

  expect(geometry.barCount).toBe(12);
  expect(geometry.legendCount).toBe(2);
  expect(geometry.gridCount).toBeGreaterThan(0);
  expect(geometry.firstBarNamespace).toBe("http://www.w3.org/2000/svg");
  expect(geometry.firstGridNamespace).toBe("http://www.w3.org/2000/svg");
  expect(geometry.firstBarAnimationName).not.toBe("none");
  expect(geometry.firstBarAnimationDuration).not.toBe("0s");

  const lineCard = page.getByTestId("chart-line-card");
  await expect(lineCard).toBeVisible();

  const lineChart = lineCard.locator("mini-tool-chart");
  const lineAnimation = await lineChart.evaluate((element) => {
    const root = element.shadowRoot;
    const seriesLine = root?.querySelector<SVGPathElement>(".series-line");
    const dataPoint = root?.querySelector<SVGCircleElement>(".data-point");

    if (!seriesLine || !dataPoint) {
      return {
        seriesLineAnimationName: "none",
        dataPointAnimationName: "none",
      };
    }

    const lineStyle = window.getComputedStyle(seriesLine);
    const pointStyle = window.getComputedStyle(dataPoint);

    return {
      seriesLineAnimationName: lineStyle.animationName,
      dataPointAnimationName: pointStyle.animationName,
    };
  });

  expect(lineAnimation.seriesLineAnimationName).not.toBe("none");
  expect(lineAnimation.dataPointAnimationName).not.toBe("none");

  const barTooltip = await barChart.evaluate(async (element) => {
    const root = element.shadowRoot;
    const firstBar = root?.querySelector<SVGRectElement>(".bar");
    if (!root || !firstBar) {
      return { visible: false, text: "" };
    }

    firstBar.focus();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    const tooltip = root.querySelector(".chart-tooltip");
    const text = tooltip?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const visible = Boolean(tooltip);

    firstBar.blur();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;

    return { visible, text };
  });

  expect(barTooltip.visible).toBe(true);
  expect(barTooltip.text).toContain("Jan");
  expect(barTooltip.text).toContain("Revenue");
  expect(barTooltip.text).toContain("4,000");

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

test("renders instagram-post smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("instagram-post-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-instagram-post").evaluate((element) => {
    const root = element.shadowRoot;
    const handle = root?.querySelector(".handle")?.textContent?.trim() ?? "";
    const captionHandle = root?.querySelector(".caption-handle")?.textContent?.trim() ?? "";
    const likeCount = root?.querySelector(".count")?.textContent?.trim() ?? "";
    const mediaCount = root?.querySelectorAll(".media-item").length ?? 0;
    const hasLogo = Boolean(root?.querySelector(".logo"));
    const hasVerifiedBadge = Boolean(root?.querySelector(".verified"));
    return { handle, captionHandle, likeCount, mediaCount, hasLogo, hasVerifiedBadge };
  });

  expect(summary.handle).toBe("alexrivera");
  expect(summary.captionHandle).toBe("alexrivera");
  expect(summary.likeCount).toBe("3.8K");
  expect(summary.mediaCount).toBe(1);
  expect(summary.hasLogo).toBe(true);
  expect(summary.hasVerifiedBadge).toBe(true);

  const instagramPost = card.locator("mini-tool-instagram-post");
  const likeButton = instagramPost.locator("button[aria-label='Like']");
  const shareButton = instagramPost.locator("button[aria-label='Share']");

  await likeButton.hover();
  await expect(instagramPost.locator(".action-wrap:has(button[aria-label='Like']) .tooltip")).toBeVisible();

  await shareButton.hover();
  await expect(instagramPost.locator(".action-wrap:has(button[aria-label='Share']) .tooltip")).toBeVisible();

  await likeButton.click();
  await expect(card.locator("#instagram-receipt")).toHaveText("Action: like");
});

test("renders linkedin-post smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("linkedin-post-card");
  await expect(card).toBeVisible();

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const element = document.querySelector("mini-tool-linkedin-post");
        const root = element?.shadowRoot;

        return {
          author: root?.querySelector(".author-name")?.textContent?.trim() ?? "",
          headline: root?.querySelector(".headline")?.textContent?.trim() ?? "",
          actions: root?.querySelectorAll("button[aria-label='Like'], button[aria-label='Share']").length ?? 0,
        };
      });
    })
    .toMatchObject({
      author: "Dr. Sarah Chen",
      headline: expect.stringContaining("VP of Engineering"),
      actions: 2,
    });
});

test("renders code-block smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("code-block-card");
  await expect(card).toBeVisible();

  const codeBlock = card.locator("mini-tool-code-block[id]");
  await expect(codeBlock).toBeVisible();

  const summary = await codeBlock.evaluate((element) => {
    const root = element.shadowRoot;
    const language = root?.querySelector(".language")?.textContent?.trim() ?? "";
    const filename = root?.querySelector(".filename")?.textContent?.trim() ?? "";
    const hasLineNumbers = Boolean(root?.querySelector(".line-number"));
    const hasToggle = Boolean(root?.querySelector(".toggle"));
    const copyLabel = root?.querySelector<HTMLButtonElement>(".copy")?.getAttribute("aria-label") ?? "";
    return { language, filename, hasLineNumbers, hasToggle, copyLabel };
  });

  expect(summary.language).toBe("TypeScript");
  expect(summary.filename).toBe("Counter.tsx");
  expect(summary.hasLineNumbers).toBe(true);
  expect(summary.hasToggle).toBe(false);
  expect(summary.copyLabel).toBe("Copy code");
});

test("renders code-diff smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("code-diff-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-code-diff").evaluate((element) => {
    const root = element.shadowRoot;
    const language = root?.querySelector(".language")?.textContent?.trim() ?? "";
    const filename = root?.querySelector(".filename")?.textContent?.trim() ?? "";
    const totals = root?.querySelector(".summary")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const hasToggle = Boolean(root?.querySelector(".toggle"));
    const copyLabel = root?.querySelector<HTMLButtonElement>(".copy")?.getAttribute("aria-label") ?? "";
    return { language, filename, totals, hasToggle, copyLabel };
  });

  expect(summary.language).toBe("TypeScript");
  expect(summary.filename).toBe("lib/auth.ts");
  expect(summary.totals).toContain("+1");
  expect(summary.totals).toContain("-1");
  expect(summary.hasToggle).toBe(false);
  expect(summary.copyLabel).toBe("Copy code");
});

test("renders parameter-slider smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("parameter-slider-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-parameter-slider").evaluate((element) => {
    const root = element.shadowRoot;
    const sliderRows = root?.querySelectorAll(".slider-row").length ?? 0;
    const actionButtons = root?.querySelectorAll("button[data-action-id]").length ?? 0;
    const ticks = root?.querySelectorAll(".tick").length ?? 0;
    const firstValue = root?.querySelector(".value")?.textContent?.trim() ?? "";
    return { sliderRows, actionButtons, ticks, firstValue };
  });

  expect(summary.sliderRows).toBe(3);
  expect(summary.actionButtons).toBe(2);
  expect(summary.ticks).toBeGreaterThan(80);
  expect(summary.firstValue).toContain("dB");

  const firstSlider = card.locator("mini-tool-parameter-slider").locator("input[type='range']").first();
  await firstSlider.focus();
  await page.keyboard.press("ArrowRight");

  await card.locator("button[data-action-id='apply']").click();
  await expect(card.locator("#parameter-slider-receipt")).toContainText("apply:");
});

test("renders plan smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("plan-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-plan").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const progress = root?.querySelector(".progress-label")?.textContent?.trim() ?? "";
    const visibleTodos = root?.querySelectorAll(".todo").length ?? 0;
    const moreLabel = root?.querySelector<HTMLButtonElement>(".more-toggle")?.textContent?.trim() ?? "";
    return { title, progress, visibleTodos, moreLabel };
  });

  expect(summary.title).toBe("Feature Implementation Plan");
  expect(summary.progress).toBe("2 of 6 complete");
  expect(summary.visibleTodos).toBe(4);
  expect(summary.moreLabel).toContain("2 more");
});

test("renders preferences-panel smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("preferences-panel-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-preferences-panel").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const heading = root?.querySelector(".section-heading")?.textContent?.trim() ?? "";
    const rows = root?.querySelectorAll(".item-row").length ?? 0;
    const saveDisabled = root?.querySelector<HTMLButtonElement>("button[data-action-id='save']")?.disabled ?? false;
    return { title, heading, rows, saveDisabled };
  });

  expect(summary.title).toBe("Automation Settings");
  expect(summary.heading).toBe("Task Rules");
  expect(summary.rows).toBe(3);
  expect(summary.saveDisabled).toBe(true);

  await card.locator("input.switch-input").click();
  await expect(card.locator("button[data-action-id='save']")).toBeEnabled();
  await card.locator("button[data-action-id='save']").click();
  await expect(card.locator("#preferences-panel-receipt")).toContainText("save:");
});

test("renders message-draft smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("message-draft-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-message-draft").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const recipients = Array.from(root?.querySelectorAll(".meta-value") ?? []).map(
      (node) => node.textContent?.trim() ?? "",
    );
    const sendLabel = root?.querySelector<HTMLButtonElement>(".action-primary")?.textContent?.trim() ?? "";
    return { title, recipients, sendLabel };
  });

  expect(summary.title).toBe("Q4 Planning Follow-up");
  expect(summary.recipients.join(" ")).toContain("sarah@acme.dev");
  expect(summary.sendLabel).toBe("Send");
});

test("renders terminal smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("terminal-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-terminal").evaluate((element) => {
    const root = element.shadowRoot;
    const command = root?.querySelector(".command-line")?.textContent?.trim() ?? "";
    const duration = root?.querySelector(".duration")?.textContent?.trim() ?? "";
    const exitCode = root?.querySelector(".exit-code")?.textContent?.trim() ?? "";
    const hasToggle = Boolean(root?.querySelector(".toggle"));
    return { command, duration, exitCode, hasToggle };
  });

  expect(summary.command).toContain("pnpm test");
  expect(summary.duration).toBe("312ms");
  expect(summary.exitCode).toBe("0");
  expect(summary.hasToggle).toBe(false);
});

test("renders image-gallery smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("image-gallery-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-image-gallery").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const description = root?.querySelector(".description")?.textContent?.trim() ?? "";
    const tileCount = root?.querySelectorAll(".tile").length ?? 0;
    return { title, description, tileCount };
  });

  expect(summary.title).toBe("Mountain landscapes");
  expect(summary.description).toContain("matching your search");
  expect(summary.tileCount).toBe(5);
});

test("renders item-carousel smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("item-carousel-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-item-carousel").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const itemCount = root?.querySelectorAll("[data-carousel-item]").length ?? 0;
    const actionCount = root?.querySelectorAll(".action").length ?? 0;
    return { title, itemCount, actionCount };
  });

  expect(summary.title).toBe("");
  expect(summary.itemCount).toBe(7);
  expect(summary.actionCount).toBeGreaterThan(0);
});

test("renders question-flow smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("question-flow-card");
  await expect(card).toBeVisible();

  await expect(page.locator("mini-tool-question-flow")).toHaveCount(1);

  const summary = await card.locator("mini-tool-question-flow").evaluate((element) => {
    const root = element.shadowRoot;
    const step = root?.querySelector(".step-indicator")?.textContent?.trim() ?? "";
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const options = root?.querySelectorAll(".option").length ?? 0;
    return { step, title, options };
  });

  expect(summary.step).toBe("Step 1 of 3");
  expect(summary.title).toBe("Select a programming language");
  expect(summary.options).toBe(3);
});

test("renders geo-map smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("geo-map-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-geo-map").evaluate((element) => {
    const root = element.shadowRoot;
    const title = root?.querySelector(".title")?.textContent?.trim() ?? "";
    const description = root?.querySelector(".description")?.textContent?.trim() ?? "";
    const markerCount = root?.querySelectorAll(".marker").length ?? 0;
    const routeCount = root?.querySelectorAll(".route-line").length ?? 0;
    return { title, description, markerCount, routeCount };
  });

  expect(summary.title).toBe("Fleet Positions");
  expect(summary.description).toContain("telemetry update");
  expect(summary.markerCount).toBeGreaterThanOrEqual(3);
  expect(summary.routeCount).toBeGreaterThan(0);
});

test("renders x-post smoke card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("x-post-card");
  await expect(card).toBeVisible();

  const summary = await card.locator("mini-tool-x-post").evaluate((element) => {
    const root = element.shadowRoot;
    const handle = root?.querySelector(".handle")?.textContent?.trim() ?? "";
    const time = root?.querySelector(".time")?.textContent?.trim() ?? "";
    const likeCount = root?.querySelector(".count")?.textContent?.trim() ?? "";
    const mediaCount = root?.querySelectorAll(".media").length ?? 0;
    const hasXLogo = Boolean(root?.querySelector(".x-logo"));
    const hasVerifiedBadge = Boolean(root?.querySelector(".badge"));
    return { handle, time, likeCount, mediaCount, hasXLogo, hasVerifiedBadge };
  });

  expect(summary.handle).toContain("@athiazohra");
  expect(summary.time).toMatch(/^\d+w$/);
  expect(summary.likeCount).toBe("5");
  expect(summary.mediaCount).toBe(0);
  expect(summary.hasXLogo).toBe(true);
  expect(summary.hasVerifiedBadge).toBe(true);

  const xPost = card.locator("mini-tool-x-post");
  const likeButton = xPost.locator("button[aria-label='Like']");
  const shareButton = xPost.locator("button[aria-label='Share']");

  await likeButton.hover();
  await expect(xPost.locator(".action-wrap:has(button[aria-label='Like']) .tooltip")).toBeVisible();

  await shareButton.hover();
  await expect(xPost.locator(".action-wrap:has(button[aria-label='Share']) .tooltip")).toBeVisible();
});
