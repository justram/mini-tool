import { expect, type Page, test } from "@playwright/test";

async function waitForFontStability(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const wait = (delayMs: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, delayMs);
      });

    if (!("fonts" in document)) {
      await wait(150);
      return;
    }

    await Promise.race([document.fonts.ready.then(() => undefined), wait(1_500)]);
  });
}

test.describe("smoke code-view visuals", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("option-list preview/code visual states stay stable", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const optionListCard = page.locator('[data-testid="option-list-card"]');
    await expect(optionListCard).toBeVisible();
    await waitForFontStability(page);

    const previewLight = await optionListCard.screenshot({ animations: "disabled" });
    expect(previewLight).toMatchSnapshot("option-list-preview-light.png");

    await optionListCard.locator('.card-tab[data-view="code"]').click();
    await expect(optionListCard.locator(".card-code-renderer")).toBeVisible();

    const codeLight = await optionListCard.screenshot({ animations: "disabled" });
    expect(codeLight).toMatchSnapshot("option-list-code-light.png");

    await page.click("#theme-toggle");
    await expect
      .poll(async () => {
        return page.evaluate(() => document.documentElement.classList.contains("dark"));
      })
      .toBe(true);

    const codeDark = await optionListCard.screenshot({ animations: "disabled" });
    expect(codeDark).toMatchSnapshot("option-list-code-dark.png");
  });
});
