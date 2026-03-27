import { expect, test } from "@playwright/test";

test("click flow confirms selection", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("option-list-card");
  await expect(card).toBeVisible();

  await card.getByRole("option", { name: "Good" }).click();
  await card.getByRole("button", { name: "Confirm" }).click();

  await expect(page.locator("#receipt")).toContainText("Confirmed: good");

  await expect
    .poll(async () => {
      return card.locator("mini-tool-option-list").evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector("[data-receipt='true']"));
      });
    })
    .toBe(true);
});

test("keyboard flow selects and confirms", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("option-list-card");
  await expect(card).toBeVisible();

  const firstOption = card.getByRole("option", { name: "Good" });
  await firstOption.focus();

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await card.getByRole("button", { name: "Confirm" }).click();

  await expect(page.locator("#receipt")).toContainText("Confirmed: fast");
});

test("preferences-panel save transitions to receipt mode", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("preferences-panel-card");
  await expect(card).toBeVisible();

  const panel = card.locator("mini-tool-preferences-panel");

  await panel.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLInputElement>(".switch-input")?.click();
  });

  await panel.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>("button[data-action-id='save']")?.click();
  });

  await expect(page.locator("#preferences-panel-receipt")).toContainText("save:");

  await expect
    .poll(async () => {
      return panel.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector("[data-receipt='true']"));
      });
    })
    .toBe(true);
});

test("code-block collapse toggle updates affordance", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("code-block-collapsible-card");
  await expect(card).toBeVisible();

  const codeBlock = card.locator("mini-tool-code-block[id]");
  await expect(codeBlock).toBeVisible();

  const initialText = await codeBlock.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(initialText).toContain("Show all");

  await codeBlock.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".toggle")?.click();
  });

  const expandedText = await codeBlock.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(expandedText).toContain("Collapse");
});

test("code-diff collapse toggle updates affordance", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("code-diff-split-card");
  await expect(card).toBeVisible();

  const codeDiff = card.locator("mini-tool-code-diff");
  await expect(codeDiff).toBeVisible();

  const initialText = await codeDiff.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(initialText).toContain("Show full diff");

  await codeDiff.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".toggle")?.click();
  });

  const expandedText = await codeDiff.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(expandedText).toContain("Collapse");
});

test("terminal collapse toggle updates affordance", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("terminal-collapsible-card");
  await expect(card).toBeVisible();

  const terminal = card.locator("mini-tool-terminal");
  await expect(terminal).toBeVisible();

  const initialText = await terminal.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(initialText).toContain("Show all");

  await terminal.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".toggle")?.click();
  });

  const expandedText = await terminal.evaluate((element) => {
    return element.shadowRoot?.querySelector(".toggle")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  });
  expect(expandedText).toContain("Collapse");
});

test("image-gallery lightbox supports keyboard open and close via Enter and Escape", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("image-gallery-card");
  await expect(card).toBeVisible();

  const gallery = card.locator("mini-tool-image-gallery");
  await expect(gallery).toBeVisible();

  await gallery.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".tile-button")?.focus();
  });

  await page.keyboard.press("Enter");

  await expect
    .poll(async () => {
      return gallery.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".lightbox"));
      });
    })
    .toBe(true);

  await page.keyboard.press("Escape");

  await expect
    .poll(async () => {
      return gallery.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".lightbox"));
      });
    })
    .toBe(false);
});

test("data-table sorting toggles with keyboard", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("data-table-card");
  await expect(card).toBeVisible();

  const table = card.locator("mini-tool-data-table");
  await expect(table).toBeVisible();

  const initialFirstSymbol = await table.evaluate((element) => {
    return element.shadowRoot?.querySelector("tbody tr:first-child td:first-child")?.textContent?.trim() ?? "";
  });
  expect(initialFirstSymbol).toBe("IBM");

  await table.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>("thead th:first-child .column-button")?.focus();
  });
  await page.keyboard.press("Enter");

  await expect
    .poll(async () => {
      return table.evaluate((element) => {
        return element.shadowRoot?.querySelector("tbody tr:first-child td:first-child")?.textContent?.trim() ?? "";
      });
    })
    .toBe("AAPL");

  await page.keyboard.press("Enter");

  await expect
    .poll(async () => {
      return table.evaluate((element) => {
        return element.shadowRoot?.querySelector("tbody tr:first-child td:first-child")?.textContent?.trim() ?? "";
      });
    })
    .toBe("ORCL");
});

test("item-carousel actions and item clicks emit receipts", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("item-carousel-card");
  await expect(card).toBeVisible();

  const carousel = card.locator("mini-tool-item-carousel");
  await expect(carousel).toBeVisible();

  await expect
    .poll(async () => {
      return carousel.evaluate((element) => {
        const root = element.shadowRoot;
        return {
          hasLeft: Boolean(root?.querySelector(".nav-left")),
          hasRight: Boolean(root?.querySelector(".nav-right")),
        };
      });
    })
    .toEqual({ hasLeft: false, hasRight: true });

  await carousel.evaluate(async (element) => {
    const root = element.shadowRoot;
    for (let index = 0; index < 12; index += 1) {
      const right = root?.querySelector<HTMLButtonElement>(".nav-right");
      if (!right) {
        break;
      }
      right.click();
      await new Promise((resolve) => {
        window.setTimeout(resolve, 30);
      });
    }
  });

  await expect
    .poll(async () => {
      return carousel.evaluate((element) => {
        const root = element.shadowRoot;
        return {
          hasLeft: Boolean(root?.querySelector(".nav-left")),
          hasRight: Boolean(root?.querySelector(".nav-right")),
        };
      });
    })
    .toEqual({ hasLeft: true, hasRight: false });

  await carousel.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".action")?.click();
  });

  await expect(page.locator("#item-carousel-receipt")).toContainText("Action:");

  await carousel.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".card-hit")?.click();
  });

  await expect(page.locator("#item-carousel-receipt")).toContainText("Open:");
});

test("question-flow supports keyboard selection and advances to next step", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("question-flow-card");
  await expect(card).toBeVisible();

  const flow = card.locator("mini-tool-question-flow");
  await expect(flow).toBeVisible();

  await flow.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".option")?.focus();
  });

  await page.keyboard.press("Enter");

  const transitionClass = await flow.evaluate(async (element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".next-button")?.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    return element.shadowRoot?.querySelector(".step-body.current")?.className ?? "";
  });

  expect(transitionClass).toContain("enter-forward");

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return element.shadowRoot?.querySelector(".step-indicator")?.textContent?.trim() ?? "";
      });
    })
    .toBe("Step 2 of 3");

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return element.shadowRoot?.querySelector(".title")?.textContent?.trim() ?? "";
      });
    })
    .toBe("Choose a framework");
});

test("question-flow complete phase switches to receipt mode", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("question-flow-card");
  await expect(card).toBeVisible();

  const flow = card.locator("mini-tool-question-flow");

  await flow.evaluate(async (element) => {
    const root = element.shadowRoot;
    root?.querySelector<HTMLButtonElement>(".option")?.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    root?.querySelector<HTMLButtonElement>(".next-button")?.click();
  });

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return element.shadowRoot?.querySelector(".step-indicator")?.textContent?.trim() ?? "";
      });
    })
    .toBe("Step 2 of 3");

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".step-body.exiting"));
      });
    })
    .toBe(false);

  await flow.evaluate(async (element) => {
    element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".option")?.[0]?.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    element.shadowRoot?.querySelector<HTMLButtonElement>(".next-button")?.click();
  });

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return element.shadowRoot?.querySelector(".step-indicator")?.textContent?.trim() ?? "";
      });
    })
    .toBe("Step 3 of 3");

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".step-body.exiting"));
      });
    })
    .toBe(false);

  await flow.evaluate(async (element) => {
    element.shadowRoot?.querySelectorAll<HTMLButtonElement>(".option")?.[0]?.click();
    await (element as { updateComplete?: Promise<unknown> }).updateComplete;
    element.shadowRoot?.querySelector<HTMLButtonElement>(".next-button")?.click();
  });

  await expect
    .poll(async () => {
      return page.locator("#question-flow-receipt").textContent();
    })
    .toContain("Complete:");

  await expect
    .poll(async () => {
      return flow.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".receipt"));
      });
    })
    .toBe(true);
});

test("geo-map marker keyboard activation shows selection panel and zoom controls change viewport", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("geo-map-card");
  await expect(card).toBeVisible();

  const map = card.locator("mini-tool-geo-map");
  await expect(map).toBeVisible();

  await expect
    .poll(async () => {
      return map.evaluate((element) => {
        return element.shadowRoot?.querySelectorAll(".marker[data-marker-id]").length ?? 0;
      });
    })
    .toBeGreaterThan(0);

  await map.evaluate((element) => {
    const marker = element.shadowRoot?.querySelector<HTMLButtonElement>(".marker[data-marker-id]");
    marker?.focus();
    marker?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });

  await expect
    .poll(async () => {
      return map.evaluate((element) => {
        return element.shadowRoot?.querySelector(".selection-title")?.textContent?.trim() ?? "";
      });
    })
    .toContain("Truck");

  const initialZoom = await map.evaluate((element) => {
    return Number(element.shadowRoot?.querySelector(".canvas")?.getAttribute("data-zoom") ?? "0");
  });

  await map.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLAnchorElement>(".leaflet-control-zoom-in")?.click();
  });

  await expect
    .poll(async () => {
      return map.evaluate((element) => {
        return Number(element.shadowRoot?.querySelector(".canvas")?.getAttribute("data-zoom") ?? "0");
      });
    })
    .toBeGreaterThan(initialZoom);

  await map.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLAnchorElement>(".leaflet-control-zoom-out")?.click();
  });

  await expect
    .poll(async () => {
      return map.evaluate((element) => {
        return Number(element.shadowRoot?.querySelector(".canvas")?.getAttribute("data-zoom") ?? "0");
      });
    })
    .toBe(initialZoom);

  await page.keyboard.press("Escape");

  await expect
    .poll(async () => {
      return map.evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector(".selection-panel"));
      });
    })
    .toBe(false);
});

test("message-draft send flow supports undo then sends confirmation", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("message-draft-card");
  await expect(card).toBeVisible();

  const draft = card.locator("mini-tool-message-draft");

  await draft.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".action-primary")?.click();
  });

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        return element.shadowRoot?.querySelector(".sending-label")?.textContent ?? "";
      });
    })
    .toContain("Sending in");

  await draft.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".action-undo")?.click();
  });

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        return element.shadowRoot?.querySelector<HTMLButtonElement>(".action-primary")?.textContent ?? "";
      });
    })
    .toContain("Send");

  await draft.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".action-primary")?.click();
  });

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        return element.shadowRoot?.querySelector("[role='status']")?.textContent ?? "";
      });
    })
    .toContain("Sent at");
});

test("chart data point click emits receipt", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("chart-card");
  await expect(card).toBeVisible();

  await card.locator("mini-tool-chart").evaluate((element) => {
    const firstBar = element.shadowRoot?.querySelector<SVGRectElement>(".bar");
    firstBar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  await expect(page.locator("#chart-receipt")).toContainText("Revenue @ Jan: 4000");
});

test("external reset buttons are component-scoped", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const approvalCard = page.getByTestId("approval-card-card");
  const instagramCard = page.getByTestId("instagram-post-card");
  await expect(approvalCard).toBeVisible();
  await expect(instagramCard).toBeVisible();

  await approvalCard.locator("mini-tool-approval-card").evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>("button[data-action-id='confirm']")?.click();
  });
  await expect(page.locator("#approval-receipt")).toContainText("Decision: approved");

  await expect
    .poll(async () => {
      return approvalCard.locator("mini-tool-approval-card").evaluate((element) => {
        return Boolean(element.shadowRoot?.querySelector("[data-receipt='true']"));
      });
    })
    .toBe(true);

  await instagramCard.locator("mini-tool-instagram-post").evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>("button[aria-label='Like']")?.click();
  });
  await expect(page.locator("#instagram-receipt")).toContainText("Action: like");

  await page.locator("#approval-card-reset").click();
  await expect(page.locator("#approval-receipt")).toHaveText("");
  await expect(page.locator("#instagram-receipt")).toContainText("Action: like");

  await page.locator("#instagram-post-reset").click();
  await expect(page.locator("#instagram-receipt")).toHaveText("");
});

test("message-draft reset returns draft to review state", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const card = page.getByTestId("message-draft-card");
  await expect(card).toBeVisible();

  const draft = card.locator("mini-tool-message-draft");
  await draft.evaluate((element) => {
    element.shadowRoot?.querySelector<HTMLButtonElement>(".actions .action:not(.action-primary)")?.click();
  });

  await expect(page.locator("#message-draft-receipt")).toContainText("Draft cancelled");

  await card.locator("#message-draft-reset").click();

  await expect
    .poll(async () => {
      return draft.evaluate((element) => {
        return element.shadowRoot?.querySelector<HTMLButtonElement>(".action-primary")?.textContent ?? "";
      });
    })
    .toContain("Send");

  await expect(page.locator("#message-draft-receipt")).toHaveText("");
});
