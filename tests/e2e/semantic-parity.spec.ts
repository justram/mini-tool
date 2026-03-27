import { expect, test } from "@playwright/test";

type SemanticContractCase = {
  component: string;
  testId: string;
  tagName: string;
  requiredText: string[];
};

const TIER_C_SEMANTIC_CONTRACTS: SemanticContractCase[] = [
  {
    component: "approval-card",
    testId: "approval-card-card",
    tagName: "mini-tool-approval-card",
    requiredText: ["Send Email Campaign", "Send Now"],
  },
  {
    component: "audio",
    testId: "audio-card",
    tagName: "mini-tool-audio",
    requiredText: ["Morning Forest", "Dawn chorus"],
  },
  {
    component: "chart",
    testId: "chart-card",
    tagName: "mini-tool-chart",
    requiredText: ["Monthly Revenue", "Revenue"],
  },
  {
    component: "citation-list",
    testId: "citation-list-card",
    tagName: "mini-tool-citation-list",
    requiredText: ["6 sources"],
  },
  {
    component: "code-block",
    testId: "code-block-card",
    tagName: "mini-tool-code-block[id]",
    requiredText: ["Counter.tsx", "setCount"],
  },
  {
    component: "code-diff",
    testId: "code-diff-card",
    tagName: "mini-tool-code-diff",
    requiredText: ["lib/auth.ts", "fetchUser"],
  },
  {
    component: "instagram-post",
    testId: "instagram-post-card",
    tagName: "mini-tool-instagram-post",
    requiredText: ["Golden hour in the city", "alexrivera"],
  },
  {
    component: "link-preview",
    testId: "link-preview-card",
    tagName: "mini-tool-link-preview",
    requiredText: ["A brief history of computing hardware", "wikipedia.org"],
  },
  {
    component: "linkedin-post",
    testId: "linkedin-post-card",
    tagName: "mini-tool-linkedin-post",
    requiredText: ["Key learnings", "see more"],
  },
  {
    component: "message-draft",
    testId: "message-draft-card",
    tagName: "mini-tool-message-draft",
    requiredText: ["Q4 Planning Follow-up", "alex@acme.dev"],
  },
  {
    component: "option-list",
    testId: "option-list-card",
    tagName: "mini-tool-option-list",
    requiredText: ["Good", "Confirm"],
  },
  {
    component: "order-summary",
    testId: "order-summary-card",
    tagName: "mini-tool-order-summary",
    requiredText: ["Premium Coffee Beans", "$"],
  },
  {
    component: "parameter-slider",
    testId: "parameter-slider-card",
    tagName: "mini-tool-parameter-slider",
    requiredText: ["Bass", "+3.0 dB"],
  },
  {
    component: "plan",
    testId: "plan-card",
    tagName: "mini-tool-plan",
    requiredText: ["Feature Implementation Plan", "Write integration tests"],
  },
  {
    component: "preferences-panel",
    testId: "preferences-panel-card",
    tagName: "mini-tool-preferences-panel",
    requiredText: ["Automation Settings", "Save Changes"],
  },
  {
    component: "terminal",
    testId: "terminal-collapsible-card",
    tagName: "mini-tool-terminal",
    requiredText: ["pnpm install", "Lockfile is up to date", "Show all"],
  },
  {
    component: "image-gallery",
    testId: "image-gallery-card",
    tagName: "mini-tool-image-gallery",
    requiredText: ["Mountain landscapes", "matching your search"],
  },
  {
    component: "geo-map",
    testId: "geo-map-card",
    tagName: "mini-tool-geo-map",
    requiredText: ["Fleet Positions", "Last telemetry update"],
  },
  {
    component: "video",
    testId: "video-card",
    tagName: "mini-tool-video",
    requiredText: ["Forest Canopy", "Sunlight filtering through the trees"],
  },
  {
    component: "x-post",
    testId: "x-post-card",
    tagName: "mini-tool-x-post",
    requiredText: ["Wild to think:", "athiazohra"],
  },
];

test("tier-c semantic contract matrix: each migrated component exposes canonical content cues", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const contract of TIER_C_SEMANTIC_CONTRACTS) {
    const host = page.getByTestId(contract.testId).locator(contract.tagName);
    await expect(host, `${contract.component} host should be visible`).toBeVisible();

    if (contract.component === "plan") {
      await host.evaluate((element) => {
        const toggle = element.shadowRoot?.querySelector<HTMLButtonElement>(".more-toggle");
        if (!toggle) {
          return;
        }

        if (toggle.getAttribute("aria-expanded") !== "true") {
          toggle.click();
        }
      });
    }

    const semanticText = await host.evaluate((element) => {
      const rootText = element.shadowRoot?.textContent ?? "";
      return rootText.replace(/\s+/g, " ").trim().toLowerCase();
    });

    expect(semanticText.length, `${contract.component} should expose non-empty semantic text`).toBeGreaterThan(0);

    for (const cue of contract.requiredText) {
      expect(semanticText, `${contract.component} should include semantic cue '${cue}' in shadow content`).toContain(
        cue.toLowerCase(),
      );
    }
  }
});

test("citation-list semantic parity: stacked variant expands to reveal source titles and domains", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const citationList = page.getByTestId("citation-list-card").locator("mini-tool-citation-list");
  await expect(citationList).toBeVisible();

  await citationList.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".stacked-trigger")?.click();
  });

  const semanticText = await citationList.evaluate((element) => {
    const rootText = element.shadowRoot?.textContent ?? "";
    return rootText.replace(/\s+/g, " ").trim().toLowerCase();
  });

  expect(semanticText).toContain("typescript documentation");
  expect(semanticText).toContain("tailwindcss.com");
});

test("terminal semantic parity: pnpm-style ansi cues remain visible in collapsed output", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const terminal = page.getByTestId("terminal-collapsible-card").locator("mini-tool-terminal");
  await expect(terminal).toBeVisible();

  const semantic = await terminal.evaluate((element) => {
    const root = element.shadowRoot;
    const text = root?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
    const hasToggle = Boolean(root?.querySelector(".toggle"));
    const colorizedSegments =
      root?.querySelectorAll(".ansi-green, .ansi-yellow, .ansi-cyan, .ansi-bright-black").length ?? 0;

    return {
      text,
      hasToggle,
      colorizedSegments,
    };
  });

  expect(semantic.text).toContain("pnpm install");
  expect(semantic.text).toContain("lockfile is up to date");
  expect(semantic.text).toContain("deprecated subdependencies");
  expect(semantic.hasToggle).toBe(true);
  expect(semantic.colorizedSegments).toBeGreaterThan(0);
});

test("code-diff semantic parity: removed and added lines remain distinct in unified mode", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const codeDiff = page.getByTestId("code-diff-card").locator("mini-tool-code-diff");
  await expect(codeDiff).toBeVisible();

  const semantic = await codeDiff.evaluate((element) => {
    const root = element.shadowRoot;

    const deletedLines = Array.from(root?.querySelectorAll<HTMLElement>(".line.del") ?? []).map((line) => {
      const sign = line.querySelector<HTMLElement>(".line-sign")?.textContent?.trim() ?? "";
      const code = line.querySelector<HTMLElement>(".line-code")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return { sign, code };
    });

    const addedLines = Array.from(root?.querySelectorAll<HTMLElement>(".line.add") ?? []).map((line) => {
      const sign = line.querySelector<HTMLElement>(".line-sign")?.textContent?.trim() ?? "";
      const code = line.querySelector<HTMLElement>(".line-code")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return { sign, code };
    });

    const hasMergedThrowAndReturnLine = Array.from(root?.querySelectorAll<HTMLElement>(".line") ?? [])
      .map((line) => line.querySelector<HTMLElement>(".line-code")?.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .some((line) => line.includes("throw new Error") && line.includes("return null"));

    return {
      deletedLines,
      addedLines,
      hasMergedThrowAndReturnLine,
    };
  });

  expect(semantic.deletedLines.some((line) => line.sign === "-" && line.code.includes("throw new Error"))).toBe(true);
  expect(semantic.addedLines.some((line) => line.sign === "+" && line.code.includes("return null"))).toBe(true);
  expect(semantic.hasMergedThrowAndReturnLine).toBe(false);
});

test("code-diff syntax highlighting: rendered tokens remain colored in both light and dark modes", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const codeDiff = page.getByTestId("code-diff-card").locator("mini-tool-code-diff");
  await expect(codeDiff).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((nextTheme) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(nextTheme);
      root.setAttribute("data-theme", nextTheme);
    }, theme);

    const syntax = await codeDiff.evaluate((element) => {
      const root = element.shadowRoot;
      const styledTokens = Array.from(root?.querySelectorAll<HTMLElement>(".line-code span[style*='color:']") ?? []);
      const palette = Array.from(
        new Set(
          styledTokens
            .map((token) => token.getAttribute("style") ?? "")
            .map((style) => style.match(/color:([^;]+)/)?.[1]?.trim() ?? "")
            .filter((color) => color.length > 0),
        ),
      );

      return {
        styledTokenCount: styledTokens.length,
        palette,
      };
    });

    expect(syntax.styledTokenCount, `theme=${theme}`).toBeGreaterThan(6);
    expect(syntax.palette.length, `theme=${theme}`).toBeGreaterThan(1);
  }
});

test("option-list selection remains visually distinct in both light and dark themes", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const optionList = page.getByTestId("option-list-card").locator("mini-tool-option-list");
  await expect(optionList).toBeVisible();

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate((nextTheme) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(nextTheme);
      root.setAttribute("data-theme", nextTheme);
    }, theme);

    await optionList.evaluate((element) => {
      const selected = element.shadowRoot?.querySelector<HTMLButtonElement>(".option[aria-selected='true']");
      selected?.click();
    });

    await optionList.locator("button[role='option']").nth(1).click();

    const styles = await optionList.evaluate((element) => {
      const root = element.shadowRoot;
      const selected = root?.querySelector<HTMLElement>(".option[aria-selected='true']");
      const unselected = root?.querySelector<HTMLElement>(".option[aria-selected='false']");
      const container = root?.querySelector<HTMLElement>(".root");

      if (!selected || !unselected || !container) {
        return null;
      }

      const selectedStyles = getComputedStyle(selected);
      const unselectedStyles = getComputedStyle(unselected);
      const containerStyles = getComputedStyle(container);

      return {
        selectedBackground: selectedStyles.backgroundColor,
        unselectedBackground: unselectedStyles.backgroundColor,
        selectedBorder: selectedStyles.borderColor,
        unselectedBorder: unselectedStyles.borderColor,
        unselectedTextColor: unselectedStyles.color,
        unselectedTextBackground: unselectedStyles.backgroundColor,
        containerTextColor: containerStyles.color,
      };
    });

    expect(styles, `theme=${theme}`).not.toBeNull();
    expect(styles?.selectedBackground, `theme=${theme}`).not.toBe(styles?.unselectedBackground);
    expect(styles?.selectedBorder, `theme=${theme}`).not.toBe(styles?.unselectedBorder);
    expect(styles?.unselectedTextColor, `theme=${theme}`).not.toBe(styles?.unselectedTextBackground);
    expect(styles?.unselectedTextColor, `theme=${theme}`).toBe(styles?.containerTextColor);
  }
});

test("linkedin-post semantic parity: long-text preview preserves source cues", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const linkedinPost = page.getByTestId("linkedin-post-card").locator("mini-tool-linkedin-post");
  await expect(linkedinPost).toBeVisible();

  const semantic = await linkedinPost.evaluate((element) => {
    const root = element.shadowRoot;
    const previewText = root?.querySelector(".body-text")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const seeMore = root?.querySelector(".see-more")?.textContent?.trim() ?? "";
    const likeCount = root?.querySelector(".count")?.textContent?.replace(/\s+/g, "").trim() ?? "";
    const previewEl = root?.querySelector<HTMLElement>(".body-preview") ?? null;
    const seeMoreEl = root?.querySelector<HTMLElement>(".see-more") ?? null;

    let verticalDeltaPx: number | null = null;
    if (previewEl && seeMoreEl) {
      const previewRect = previewEl.getBoundingClientRect();
      const seeMoreRect = seeMoreEl.getBoundingClientRect();
      verticalDeltaPx = Math.abs(seeMoreRect.bottom - previewRect.bottom);
    }

    return {
      previewText,
      seeMore,
      likeCount,
      verticalDeltaPx,
      containsKeyLearnings: previewText.includes("Key learnings:"),
      containsProblemLine: previewText.includes("Start with the problem"),
      containsTruncatedTail: previewText.includes("...") && previewText.includes("Proud of everyone"),
    };
  });

  expect(semantic.containsKeyLearnings).toBe(true);
  expect(semantic.containsProblemLine).toBe(true);
  expect(semantic.containsTruncatedTail).toBe(true);
  expect(semantic.seeMore.toLowerCase()).toBe("see more");
  expect(semantic.likeCount).toBe("(847)");
  expect(semantic.verticalDeltaPx).not.toBeNull();
  expect(semantic.verticalDeltaPx ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(6);
});

test("message-draft semantic parity: email metadata renders and escape transitions to cancelled receipt", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const draft = page.getByTestId("message-draft-card").locator("mini-tool-message-draft");
  await expect(draft).toBeVisible();

  const emailMeta = await draft.evaluate((element) => {
    const root = element.shadowRoot;
    return {
      hasSubject: Boolean(root?.querySelector(".title")?.textContent?.includes("Q4 Planning Follow-up")),
      hasRecipientRow: Boolean(root?.querySelector(".meta-table")),
    };
  });

  expect(emailMeta.hasSubject).toBe(true);
  expect(emailMeta.hasRecipientRow).toBe(true);

  await draft.evaluate((element) => {
    const article = element.shadowRoot?.querySelector<HTMLElement>("[data-slot='message-draft']");
    article?.focus();
    article?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        const host = element.shadowRoot?.querySelector("[data-slot='message-draft']");
        return host !== null;
      });
    })
    .toBe(true);

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        return element.shadowRoot?.querySelector("[role='status']")?.textContent ?? "";
      });
    })
    .toContain("Draft cancelled");
});

test("code-diff split geometry: line content renders in two independent panes", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const splitDiff = page.getByTestId("code-diff-split-card").locator("mini-tool-code-diff");
  await expect(splitDiff).toBeVisible();

  const geometry = await splitDiff.evaluate((element) => {
    const root = element.shadowRoot;
    const grid = root?.querySelector<HTMLElement>(".split-grid");
    const leftPane = root?.querySelector<HTMLElement>(".split-pane.left");
    const rightPane = root?.querySelector<HTMLElement>(".split-pane.right");

    if (!grid || !leftPane || !rightPane) {
      return {
        hasStructure: false,
        panesSeparated: false,
        leftRowCount: 0,
        rightRowCount: 0,
      };
    }

    const leftRect = leftPane.getBoundingClientRect();
    const rightRect = rightPane.getBoundingClientRect();

    const leftRowCount = leftPane.querySelectorAll(".split-pane-row").length;
    const rightRowCount = rightPane.querySelectorAll(".split-pane-row").length;

    return {
      hasStructure: true,
      panesSeparated: leftRect.right <= rightRect.left + 1,
      leftRowCount,
      rightRowCount,
    };
  });

  expect(geometry.hasStructure).toBe(true);
  expect(geometry.panesSeparated).toBe(true);
  expect(geometry.leftRowCount).toBeGreaterThan(0);
  expect(geometry.rightRowCount).toBeGreaterThan(0);
  expect(geometry.leftRowCount).toBe(geometry.rightRowCount);
});
