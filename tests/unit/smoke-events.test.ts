import { describe, expect, it } from "vitest";
import { MINI_TOOLUI_EXAMPLE_EVENTS } from "../../example/runtime/events";

describe("smoke events", () => {
  it("contains unique event names", () => {
    const values = Object.values(MINI_TOOLUI_EXAMPLE_EVENTS);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });
});
