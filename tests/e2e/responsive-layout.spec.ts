import { expect, type Locator, type Page, test } from "@playwright/test";

type LayoutStyleCheck = {
  name: string;
  selector: string;
  property: string;
  expected: string;
};

type ResponsiveCase = {
  component: string;
  cardTestId: string;
  hostSelector: string;
  innerSelector: string;
  allowWidthCap?: boolean;
  requireCenteredInnerWhenNarrower?: boolean;
  resetButtonId?: string;
  beforeMeasureAction?: "question-flow-complete";
  layoutStyleChecks?: LayoutStyleCheck[];
};

type BaseResponsiveCase = Omit<ResponsiveCase, "component">;

const baseResponsiveCases: BaseResponsiveCase[] = [
  {
    cardTestId: "link-preview-card",
    hostSelector: "mini-tool-link-preview",
    innerSelector: "article",
  },
  {
    cardTestId: "image-card",
    hostSelector: "mini-tool-image",
    innerSelector: "article",
  },
  {
    cardTestId: "audio-card",
    hostSelector: "mini-tool-audio",
    innerSelector: "article",
    allowWidthCap: true,
  },
  {
    cardTestId: "video-card",
    hostSelector: "mini-tool-video",
    innerSelector: "article",
  },
  {
    cardTestId: "citation-card",
    hostSelector: "mini-tool-citation",
    innerSelector: ".card",
  },
  {
    cardTestId: "citation-list-card",
    hostSelector: "mini-tool-citation-list",
    innerSelector: ".root",
  },
  {
    cardTestId: "progress-tracker-card",
    hostSelector: "mini-tool-progress-tracker",
    innerSelector: ".card",
  },
  {
    cardTestId: "option-list-card",
    hostSelector: "mini-tool-option-list",
    innerSelector: ".root",
  },
  {
    cardTestId: "approval-card-card",
    hostSelector: "mini-tool-approval-card",
    innerSelector: ".card",
  },
  {
    cardTestId: "order-summary-card",
    hostSelector: "mini-tool-order-summary",
    innerSelector: ".card",
  },
  {
    cardTestId: "data-table-card",
    hostSelector: "mini-tool-data-table",
    innerSelector: ".root",
  },
  {
    cardTestId: "stats-display-card",
    hostSelector: "mini-tool-stats-display",
    innerSelector: ".card",
    allowWidthCap: true,
  },
  {
    cardTestId: "chart-card",
    hostSelector: "mini-tool-chart",
    innerSelector: ".container",
    allowWidthCap: true,
  },
  {
    cardTestId: "chart-line-card",
    hostSelector: "mini-tool-chart",
    innerSelector: ".container",
    allowWidthCap: true,
  },
  {
    cardTestId: "x-post-card",
    hostSelector: "mini-tool-x-post",
    innerSelector: ".root",
    layoutStyleChecks: [
      { name: "action-row-top-spacing", selector: ".actions", property: "margin-top", expected: "12px" },
      { name: "action-row-gap", selector: ".actions", property: "column-gap", expected: "16px" },
    ],
  },
  {
    cardTestId: "instagram-post-card",
    hostSelector: "mini-tool-instagram-post",
    innerSelector: ".root",
    allowWidthCap: true,
    layoutStyleChecks: [
      { name: "body-row-gap", selector: ".body", property: "row-gap", expected: "8px" },
      { name: "action-row-gap", selector: ".actions", property: "column-gap", expected: "4px" },
    ],
  },
  {
    cardTestId: "linkedin-post-card",
    hostSelector: "mini-tool-linkedin-post",
    innerSelector: ".root",
    layoutStyleChecks: [
      { name: "action-row-top-spacing", selector: ".actions", property: "margin-top", expected: "4px" },
      { name: "action-row-border-inset", selector: ".actions", property: "padding-top", expected: "6px" },
    ],
  },
  {
    cardTestId: "code-block-card",
    hostSelector: "mini-tool-code-block[id]",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "code-block-collapsible-card",
    hostSelector: "mini-tool-code-block[id]",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "code-diff-card",
    hostSelector: "mini-tool-code-diff",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "code-diff-split-card",
    hostSelector: "mini-tool-code-diff",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "parameter-slider-card",
    hostSelector: "mini-tool-parameter-slider",
    innerSelector: ".root",
    layoutStyleChecks: [{ name: "major-tick-height", selector: ".tick.major", property: "height", expected: "8px" }],
  },
  {
    cardTestId: "plan-card",
    hostSelector: "mini-tool-plan",
    innerSelector: ".root",
    layoutStyleChecks: [
      { name: "todo-row-corner-radius", selector: ".todo-row", property: "border-radius", expected: "10px" },
    ],
  },
  {
    cardTestId: "preferences-panel-card",
    hostSelector: "mini-tool-preferences-panel",
    innerSelector: ".root",
    layoutStyleChecks: [
      { name: "switch-track-clips-thumb", selector: ".switch-control", property: "overflow", expected: "hidden" },
    ],
  },
  {
    cardTestId: "message-draft-card",
    hostSelector: "mini-tool-message-draft",
    innerSelector: ".container",
    layoutStyleChecks: [
      { name: "action-pill-radius", selector: ".action", property: "border-radius", expected: "999px" },
    ],
  },
  {
    cardTestId: "terminal-card",
    hostSelector: "mini-tool-terminal",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "image-gallery-card",
    hostSelector: "mini-tool-image-gallery",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "item-carousel-card",
    hostSelector: "mini-tool-item-carousel",
    innerSelector: ".root",
    allowWidthCap: true,
  },
  {
    cardTestId: "question-flow-card",
    hostSelector: "mini-tool-question-flow",
    innerSelector: ".root",
    allowWidthCap: true,
    resetButtonId: "question-flow-reset",
  },
  {
    cardTestId: "question-flow-card",
    hostSelector: "mini-tool-question-flow",
    innerSelector: ".receipt-card",
    allowWidthCap: true,
    resetButtonId: "question-flow-reset",
    beforeMeasureAction: "question-flow-complete",
  },
  {
    cardTestId: "geo-map-card",
    hostSelector: "mini-tool-geo-map",
    innerSelector: ".root",
  },
];

const responsiveCases: ResponsiveCase[] = baseResponsiveCases.map((scenario) => {
  return {
    ...scenario,
    component: scenario.hostSelector.replace("mini-tool-", ""),
    requireCenteredInnerWhenNarrower: scenario.allowWidthCap ?? false,
  };
});

async function resetCardState(page: Page, resetButtonId?: string): Promise<void> {
  if (!resetButtonId) {
    return;
  }

  const resetButton = page.locator(`#${resetButtonId}`);
  if ((await resetButton.count()) === 0) {
    return;
  }

  await resetButton.click();
}

async function runBeforeMeasureAction(card: Locator, action?: ResponsiveCase["beforeMeasureAction"]): Promise<void> {
  if (action !== "question-flow-complete") {
    return;
  }

  const flow = card.locator("mini-tool-question-flow");
  await expect(flow).toBeVisible();

  await flow.evaluate(async (element) => {
    const root = element.shadowRoot;
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    for (let index = 0; index < 3; index += 1) {
      const option = root?.querySelector<HTMLElement>(".option:not([disabled])");
      option?.click();
      await delay(90);

      const actionButton = root?.querySelector<HTMLButtonElement>(".next-button");
      actionButton?.click();
      await delay(320);
    }
  });

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".receipt-card"));
      });
    })
    .toBe(true);
}

test.describe("responsive layout guards", () => {
  test("migrated components do not overflow their smoke cards at narrow viewport and respond to width changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const targetComponent = process.env.MIGRATION_COMPONENT;
    const casesToCheck = targetComponent
      ? responsiveCases.filter((scenario) => scenario.component === targetComponent)
      : responsiveCases;

    expect(
      casesToCheck.length,
      `no responsive scenarios configured for component '${targetComponent ?? "all"}'`,
    ).toBeGreaterThan(0);

    const narrowHostWidths = new Map<string, number>();
    const narrowInnerWidths = new Map<string, number>();

    for (const scenario of casesToCheck) {
      const card = page.getByTestId(scenario.cardTestId);
      await expect(card).toBeVisible();

      await resetCardState(page, scenario.resetButtonId);
      await runBeforeMeasureAction(card, scenario.beforeMeasureAction);

      const sectionOverflow = await card.evaluate((section) => {
        return section.scrollWidth - section.clientWidth;
      });

      if (scenario.allowWidthCap) {
        expect(
          sectionOverflow,
          `${scenario.cardTestId} capped-width component should avoid severe horizontal overflow in smoke card`,
        ).toBeLessThanOrEqual(40);
      } else {
        expect(
          sectionOverflow,
          `${scenario.cardTestId} should not introduce horizontal overflow in smoke card`,
        ).toBeLessThanOrEqual(1);
      }

      const hostOverflowPx = await card.evaluate((section, selector) => {
        const host = section.querySelector(selector);
        if (!host) {
          return Number.POSITIVE_INFINITY;
        }

        const sectionRect = section.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        const overflowLeft = Math.max(0, sectionRect.left - hostRect.left);
        const overflowRight = Math.max(0, hostRect.right - sectionRect.right);
        return Math.max(overflowLeft, overflowRight);
      }, scenario.hostSelector);

      if (scenario.allowWidthCap) {
        expect(
          hostOverflowPx,
          `${scenario.cardTestId} capped-width host should avoid severe clipping in smoke card`,
        ).toBeLessThanOrEqual(40);
      } else {
        expect(hostOverflowPx, `${scenario.cardTestId} host should fit within smoke card bounds`).toBeLessThanOrEqual(
          1,
        );
      }

      const narrowHostWidth = await card.evaluate((section, selector) => {
        const host = section.querySelector(selector);
        if (!host) {
          return Number.NaN;
        }

        return host.getBoundingClientRect().width;
      }, scenario.hostSelector);

      narrowHostWidths.set(scenario.cardTestId, narrowHostWidth);

      const narrowInnerWidth = await card.evaluate(
        (section, config) => {
          const host = section.querySelector(config.hostSelector);
          if (!host) {
            return Number.NaN;
          }

          const inner = host.shadowRoot?.querySelector(config.innerSelector);
          if (!inner) {
            return Number.NaN;
          }

          return inner.getBoundingClientRect().width;
        },
        {
          hostSelector: scenario.hostSelector,
          innerSelector: scenario.innerSelector,
        },
      );

      narrowInnerWidths.set(scenario.cardTestId, narrowInnerWidth);

      if (scenario.requireCenteredInnerWhenNarrower) {
        const centerDelta = await card.evaluate(
          (section, config) => {
            const host = section.querySelector(config.hostSelector);
            if (!host) {
              return Number.NaN;
            }

            const inner = host.shadowRoot?.querySelector<HTMLElement>(config.innerSelector);
            if (!inner) {
              return Number.NaN;
            }

            const hostRect = host.getBoundingClientRect();
            const innerRect = inner.getBoundingClientRect();

            const leftGap = innerRect.left - hostRect.left;
            const rightGap = hostRect.right - innerRect.right;

            if (innerRect.width >= hostRect.width - 2) {
              return 0;
            }

            return Math.abs(leftGap - rightGap);
          },
          {
            hostSelector: scenario.hostSelector,
            innerSelector: scenario.innerSelector,
          },
        );

        expect(
          centerDelta,
          `${scenario.cardTestId} narrow inner surface should be horizontally centered inside host when width-capped`,
        ).toBeLessThanOrEqual(2);
      }

      const internalOverflow = await card.evaluate(
        (section, config) => {
          const host = section.querySelector(config.hostSelector);
          if (!host) {
            return Number.POSITIVE_INFINITY;
          }

          const inner = host.shadowRoot?.querySelector(config.innerSelector);
          if (!inner) {
            return Number.POSITIVE_INFINITY;
          }

          return inner.scrollWidth - host.clientWidth;
        },
        {
          hostSelector: scenario.hostSelector,
          innerSelector: scenario.innerSelector,
        },
      );

      if (scenario.allowWidthCap) {
        expect(
          internalOverflow,
          `${scenario.cardTestId} capped-width inner layout should avoid severe overflow against host width`,
        ).toBeLessThanOrEqual(40);
      } else {
        expect(
          internalOverflow,
          `${scenario.cardTestId} inner layout should not overflow host width`,
        ).toBeLessThanOrEqual(1);
      }

      for (const check of scenario.layoutStyleChecks ?? []) {
        const styleValue = await card.evaluate(
          (section, config) => {
            const host = section.querySelector(config.hostSelector);
            if (!host) {
              return null;
            }

            const target = host.shadowRoot?.querySelector<HTMLElement>(config.selector);
            if (!target) {
              return null;
            }

            return getComputedStyle(target).getPropertyValue(config.property).trim();
          },
          {
            hostSelector: scenario.hostSelector,
            selector: check.selector,
            property: check.property,
          },
        );

        expect(styleValue, `${scenario.cardTestId} missing layout check target '${check.selector}'`).not.toBeNull();
        expect(styleValue, `${scenario.cardTestId} layout check '${check.name}'`).toBe(check.expected);
      }
    }

    await page.setViewportSize({ width: 1100, height: 800 });

    for (const scenario of casesToCheck) {
      const card = page.getByTestId(scenario.cardTestId);
      await expect(card).toBeVisible();

      await resetCardState(page, scenario.resetButtonId);
      await runBeforeMeasureAction(card, scenario.beforeMeasureAction);

      const wideHostWidth = await card.evaluate((section, selector) => {
        const host = section.querySelector(selector);
        if (!host) {
          return Number.NaN;
        }

        return host.getBoundingClientRect().width;
      }, scenario.hostSelector);

      const narrowHostWidth = narrowHostWidths.get(scenario.cardTestId);
      expect(
        narrowHostWidth,
        `${scenario.cardTestId} missing narrow host width capture for responsiveness assertion`,
      ).toBeDefined();

      if (scenario.allowWidthCap) {
        expect(
          wideHostWidth,
          `${scenario.cardTestId} host width should not shrink when viewport width increases (capped width component)`,
        ).toBeGreaterThanOrEqual((narrowHostWidth ?? 0) - 1);
      } else {
        expect(
          wideHostWidth,
          `${scenario.cardTestId} host width should expand when viewport width increases`,
        ).toBeGreaterThan((narrowHostWidth ?? 0) + 24);
      }

      const wideInnerWidth = await card.evaluate(
        (section, config) => {
          const host = section.querySelector(config.hostSelector);
          if (!host) {
            return Number.NaN;
          }

          const inner = host.shadowRoot?.querySelector(config.innerSelector);
          if (!inner) {
            return Number.NaN;
          }

          return inner.getBoundingClientRect().width;
        },
        {
          hostSelector: scenario.hostSelector,
          innerSelector: scenario.innerSelector,
        },
      );

      if (scenario.requireCenteredInnerWhenNarrower) {
        const centerDelta = await card.evaluate(
          (section, config) => {
            const host = section.querySelector(config.hostSelector);
            if (!host) {
              return Number.NaN;
            }

            const inner = host.shadowRoot?.querySelector<HTMLElement>(config.innerSelector);
            if (!inner) {
              return Number.NaN;
            }

            const hostRect = host.getBoundingClientRect();
            const innerRect = inner.getBoundingClientRect();
            const leftGap = innerRect.left - hostRect.left;
            const rightGap = hostRect.right - innerRect.right;

            if (innerRect.width >= hostRect.width - 2) {
              return 0;
            }

            return Math.abs(leftGap - rightGap);
          },
          {
            hostSelector: scenario.hostSelector,
            innerSelector: scenario.innerSelector,
          },
        );

        expect(
          centerDelta,
          `${scenario.cardTestId} wide inner surface should stay horizontally centered inside host when width-capped`,
        ).toBeLessThanOrEqual(2);
      }

      const narrowInnerWidth = narrowInnerWidths.get(scenario.cardTestId);
      expect(
        narrowInnerWidth,
        `${scenario.cardTestId} missing narrow inner width capture for responsiveness assertion`,
      ).toBeDefined();

      if (scenario.allowWidthCap) {
        expect(
          wideInnerWidth,
          `${scenario.cardTestId} inner layout should not shrink when viewport width increases (capped width component)`,
        ).toBeGreaterThanOrEqual((narrowInnerWidth ?? 0) - 1);
      } else {
        expect(
          wideInnerWidth,
          `${scenario.cardTestId} inner layout should expand when viewport width increases`,
        ).toBeGreaterThan((narrowInnerWidth ?? 0) + 24);
      }
    }
  });
});
