import { describe, expect, it } from "vitest";
import { MINI_TOOLUI_EXAMPLE_HARNESS_CARDS } from "../../example/harness-config";
import { PRESET_ENTRIES } from "../../example/presets/registry";

describe("smoke preset registry", () => {
  it("includes every smoke card element id", () => {
    const presetElementIds = new Set(PRESET_ENTRIES.map((entry) => entry.elementId));

    for (const card of MINI_TOOLUI_EXAMPLE_HARNESS_CARDS) {
      expect(presetElementIds.has(card.elementId)).toBe(true);
    }
  });

  it("contains no duplicate or unused element ids", () => {
    const presetElementIds = PRESET_ENTRIES.map((entry) => entry.elementId);
    const uniquePresetElementIds = new Set(presetElementIds);

    expect(uniquePresetElementIds.size).toBe(presetElementIds.length);

    const harnessElementIds = new Set(MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.map((card) => card.elementId));
    const unused = [...uniquePresetElementIds].filter((elementId) => !harnessElementIds.has(elementId));

    expect(unused).toEqual([]);
  });
});
