import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getMiniParser, supportedMiniBenchmarkComponents } from "../../benchmarks/mini-parser";
import { benchmarkModuleComponents } from "../../benchmarks/modules";
import { getSourceEquivalentParser, supportedSourceAdapterComponents } from "../../benchmarks/source-contract-adapters";

describe("benchmark fixture integrity", () => {
  it("keeps component benchmark modules aligned with fixture files", () => {
    const fixturesDir = join(process.cwd(), "benchmarks", "fixtures");
    const fixtureComponents = readdirSync(fixturesDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();

    expect(benchmarkModuleComponents.slice().sort()).toEqual(fixtureComponents);
    expect(supportedMiniBenchmarkComponents()).toEqual(fixtureComponents);
    expect(supportedSourceAdapterComponents()).toEqual(fixtureComponents);
  });

  it("validates every fixture against both mini and source benchmark parsers", async () => {
    const fixturesDir = join(process.cwd(), "benchmarks", "fixtures");
    const components = supportedMiniBenchmarkComponents();

    for (const component of components) {
      const fixturePath = join(fixturesDir, `${component}.json`);
      const payload = JSON.parse(readFileSync(fixturePath, "utf8"));

      const miniParser = await getMiniParser(component);
      const sourceParser = getSourceEquivalentParser(component);

      expect(() => miniParser(payload)).not.toThrow();
      expect(() => sourceParser(payload)).not.toThrow();
    }
  });

  it("loads link-preview fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "link-preview.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id).toBeTypeOf("string");
    expect(payload.href).toMatch(/^https?:\/\//);
  });

  it("loads option-list fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "option-list.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.options)).toBe(true);
    expect(payload.options.length).toBeGreaterThan(0);
  });

  it("loads image fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "image.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.src).toMatch(/^https?:\/\//);
    expect(payload.alt.length).toBeGreaterThan(0);
  });

  it("loads image-gallery fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "image-gallery.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.images)).toBe(true);
    expect(payload.images.length).toBeGreaterThan(0);
    expect(payload.images[0].src).toMatch(/^https?:\/\//);
  });

  it("loads geo-map fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "geo-map.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.markers)).toBe(true);
    expect(payload.markers.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.routes)).toBe(true);
    expect(payload.routes[0].points.length).toBeGreaterThan(1);
  });

  it("loads citation fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "citation.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.href).toMatch(/^https?:\/\//);
    expect(payload.title.length).toBeGreaterThan(0);
  });

  it("loads audio fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "audio.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.src).toMatch(/^https?:\/\//);
    expect(payload.assetId.length).toBeGreaterThan(0);
  });

  it("loads video fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "video.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.src).toMatch(/^https?:\/\//);
    expect(payload.assetId.length).toBeGreaterThan(0);
    expect(payload.ratio).toBe("16:9");
  });

  it("loads progress-tracker fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "progress-tracker.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.steps)).toBe(true);
    expect(payload.steps.length).toBeGreaterThan(0);
  });

  it("loads citation-list fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "citation-list.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.citations)).toBe(true);
    expect(payload.citations.length).toBeGreaterThan(0);
  });

  it("loads approval-card fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "approval-card.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.title.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.metadata)).toBe(true);
  });

  it("loads order-summary fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "order-summary.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.pricing.total).toBeGreaterThan(0);
  });

  it("loads stats-display fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "stats-display.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(Array.isArray(payload.stats)).toBe(true);
    expect(payload.stats.length).toBeGreaterThan(0);
    expect(payload.title.length).toBeGreaterThan(0);
  });

  it("loads chart fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "chart.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.type === "bar" || payload.type === "line").toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBeGreaterThan(0);
  });

  it("loads x-post fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "x-post.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.author.handle.length).toBeGreaterThan(0);
    expect(payload.author.avatarUrl).toMatch(/^https?:\/\//);
  });

  it("loads instagram-post fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "instagram-post.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.author.handle.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.media)).toBe(true);
    expect(payload.media.length).toBeGreaterThan(0);
  });

  it("loads linkedin-post fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "linkedin-post.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.author.name.length).toBeGreaterThan(0);
    expect(typeof payload.author.avatarUrl).toBe("string");
  });

  it("loads code-block fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "code-block.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.code.length).toBeGreaterThan(0);
    expect(["visible", "hidden"]).toContain(payload.lineNumbers);
  });

  it("loads code-diff fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "code-diff.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(["visible", "hidden"]).toContain(payload.lineNumbers);
    expect(["unified", "split"]).toContain(payload.diffStyle);
    expect(typeof payload.oldCode === "string" || typeof payload.patch === "string").toBe(true);
  });

  it("loads message-draft fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "message-draft.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(["email", "slack"]).toContain(payload.channel);
    expect(payload.body.length).toBeGreaterThan(0);
  });

  it("loads parameter-slider fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "parameter-slider.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.sliders)).toBe(true);
    expect(payload.sliders.length).toBeGreaterThan(0);
    expect(payload.sliders[0].id.length).toBeGreaterThan(0);
  });

  it("loads plan fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "plan.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.title.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.todos)).toBe(true);
    expect(payload.todos.length).toBeGreaterThan(0);
  });

  it("loads preferences-panel fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "preferences-panel.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.title.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.sections)).toBe(true);
    expect(payload.sections.length).toBeGreaterThan(0);
  });

  it("loads terminal fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "terminal.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(payload.command.length).toBeGreaterThan(0);
    expect(payload.exitCode).toBeGreaterThanOrEqual(0);
  });

  it("loads question-flow fixture", () => {
    const file = join(process.cwd(), "benchmarks", "fixtures", "question-flow.json");
    const payload = JSON.parse(readFileSync(file, "utf8"));

    expect(payload.id.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.steps)).toBe(true);
    expect(payload.steps.length).toBeGreaterThan(0);
    expect(payload.steps[0].id.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.steps[0].options)).toBe(true);
    expect(payload.steps[0].options.length).toBeGreaterThan(0);
  });
});
