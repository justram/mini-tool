import { describe, expect, it } from "vitest";
import { buildVisualBisectVariants, parseVisualBisectLayers } from "../../scripts/visual-layer-bisect";

describe("visual-layer-bisect helpers", () => {
  it("defaults to all layers", () => {
    expect(parseVisualBisectLayers(undefined)).toEqual(["style", "layout", "content"]);
  });

  it("deduplicates and preserves canonical order", () => {
    expect(parseVisualBisectLayers("content,style,content")).toEqual(["style", "content"]);
  });

  it("fails for unknown layer", () => {
    expect(() => parseVisualBisectLayers("style,unknown")).toThrowError(/Invalid layer/);
  });

  it("builds baseline plus one variant per layer", () => {
    const variants = buildVisualBisectVariants(["style", "layout"]);
    expect(variants.map((variant) => variant.id)).toEqual(["baseline", "without-style", "without-layout"]);
  });
});
