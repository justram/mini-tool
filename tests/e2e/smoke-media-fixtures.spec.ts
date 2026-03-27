import { expect, test } from "@playwright/test";
import { MINI_TOOLUI_EXAMPLE_HARNESS_CARDS } from "../../example/harness-config";

test("smoke app uses production-like media URLs for demo-critical components", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const linkPreviewImage = await page.locator("mini-tool-link-preview").evaluate((element) => {
    return element.shadowRoot?.querySelector<HTMLImageElement>("img")?.src ?? "";
  });
  expect(linkPreviewImage).toMatch(/^https?:\/\//);

  const imageSource = await page.locator("mini-tool-image").evaluate((element) => {
    return element.shadowRoot?.querySelector<HTMLImageElement>("img")?.src ?? "";
  });
  expect(imageSource).toMatch(/^https?:\/\//);

  const audioSource = await page.locator("mini-tool-audio").evaluate((element) => {
    return element.shadowRoot?.querySelector<HTMLAudioElement>("audio")?.currentSrc ?? "";
  });
  expect(audioSource).toMatch(/^https?:\/\//);

  const videoState = await page.locator("mini-tool-video").evaluate((element) => {
    const video = element.shadowRoot?.querySelector<HTMLVideoElement>("video");
    return {
      source: video?.currentSrc ?? "",
      poster: video?.poster ?? "",
    };
  });
  expect(videoState.source).toMatch(/^https?:\/\//);
  expect(videoState.poster).toMatch(/^https?:\/\//);
});

test("smoke app supports constrained and fluid preview modes", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const body = page.locator("body");
  const firstCard = page.locator(".card").first();

  await page.click("#layout-constrained");
  await expect(body).toHaveClass(/layout-constrained/);
  const constrainedWidth = await firstCard.evaluate((node) => node.getBoundingClientRect().width);

  await page.click("#layout-fluid");
  await expect(body).toHaveClass(/layout-fluid/);
  await expect
    .poll(async () => {
      return firstCard.evaluate((node) => node.getBoundingClientRect().width);
    })
    .toBeGreaterThan(constrainedWidth);

  await page.click("#layout-constrained");
  await expect(body).toHaveClass(/layout-constrained/);
});

test("smoke app exposes code view for every card", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator('.card .card-tab[data-view="code"]')).toHaveCount(MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.length);

  const optionListCard = page.locator('[data-testid="option-list-card"]');
  await optionListCard.locator('.card-tab[data-view="code"]').click();

  const codeRenderer = optionListCard.locator(".card-code-renderer");
  await expect(codeRenderer).toBeVisible();

  const renderedCode = await codeRenderer.evaluate((element) => {
    return (element as { payload?: { code?: string } }).payload?.code ?? "";
  });

  expect(renderedCode).toContain('import "mini-toolui/components/option-list";');
  expect(renderedCode).toContain('"maxSelections": 2');
});

test("smoke app supports per-card preview/code tabs", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const optionListCard = page.locator('[data-testid="option-list-card"]');

  await expect(optionListCard.locator("mini-tool-option-list")).toBeVisible();
  await expect(optionListCard.locator(".card-code-renderer")).toBeHidden();

  await optionListCard.locator('.card-tab[data-view="code"]').click();
  await expect(optionListCard.locator("mini-tool-option-list")).toBeHidden();
  await expect(optionListCard.locator(".card-code-renderer")).toBeVisible();

  await optionListCard.locator('.card-tab[data-view="preview"]').click();
  await expect(optionListCard.locator("mini-tool-option-list")).toBeVisible();
  await expect(optionListCard.locator(".card-code-renderer")).toBeHidden();
});
