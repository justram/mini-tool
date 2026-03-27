import { expect, test } from "@playwright/test";

test.describe("stats-display sparkline visual semantics", () => {
  test("renders SVG gradient definitions in SVG namespace", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const gradient = root?.querySelector("linearGradient");

      return {
        exists: Boolean(gradient),
        namespaceUri: gradient?.namespaceURI ?? null,
        ctorName: gradient?.constructor?.name ?? null,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.namespaceUri).toBe("http://www.w3.org/2000/svg");
    expect(result.ctorName).toBe("SVGLinearGradientElement");
  });

  test("renders non-empty area fill under sparkline curve", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const polygon = root?.querySelector<SVGPolygonElement>(".sparkline-fill");
      const points = polygon?.getAttribute("points") ?? "";
      const computedFill = polygon ? window.getComputedStyle(polygon).fill : null;

      return {
        exists: Boolean(polygon),
        pointsCount: points.trim().split(/\s+/).filter(Boolean).length,
        computedFill,
      };
    });

    expect(result.exists).toBe(true);
    expect(result.pointsCount).toBeGreaterThanOrEqual(4);
    expect(result.computedFill).toContain("url(");
  });

  test("keeps compact notation suffix split into a dedicated span", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const statCells = Array.from(root?.querySelectorAll(".stat-cell") ?? []);
      const activeUsersCell = statCells[1];
      const suffix = activeUsersCell?.querySelector(".value-suffix");

      return {
        exists: Boolean(suffix),
        text: suffix?.textContent?.trim() ?? "",
      };
    });

    expect(result.exists).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });

  test("shows down arrow for improving inverted diff metrics", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const statCells = Array.from(root?.querySelectorAll(".stat-cell") ?? []);
      const churnCell = statCells[2];
      const diff = churnCell?.querySelector(".diff");
      const arrow = churnCell?.querySelector(".diff-arrow");

      return {
        diffText: diff?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        arrowText: arrow?.textContent?.trim() ?? "",
      };
    });

    expect(result.arrowText).toBe("↓");
    expect(result.diffText).toContain("−0.8%");
  });

  test("does not render a top separator for the first tile on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const firstCell = root?.querySelector<HTMLElement>(".stat-cell");

      if (!firstCell) {
        return { borderTopWidth: "" };
      }

      const style = window.getComputedStyle(firstCell);
      return {
        borderTopWidth: style.borderTopWidth,
      };
    });

    expect(result.borderTopWidth).toBe("0px");
  });

  test("keeps sparkline overlay hidden when reduced motion is enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.locator("mini-tool-stats-display").evaluate((element) => {
      const root = element.shadowRoot;
      const highlight = root?.querySelector<SVGPolylineElement>(".sparkline-line");

      return {
        highlightOpacity: highlight ? window.getComputedStyle(highlight).opacity : "",
      };
    });

    expect(result.highlightOpacity).toBe("0");
  });
});
