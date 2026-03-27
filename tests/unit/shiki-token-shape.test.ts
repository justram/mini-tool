import { describe, expect, it } from "vitest";
import { normalizeCodeToTokensResult } from "../../src/shared/shiki/token-lines";

describe("normalizeCodeToTokensResult", () => {
  it("accepts direct token line arrays", () => {
    const result = normalizeCodeToTokensResult([[{ content: "const", color: "#fff" }]]);

    expect(result).toHaveLength(1);
    expect(result[0]?.[0]?.content).toBe("const");
  });

  it("accepts wrapped token result shape", () => {
    const result = normalizeCodeToTokensResult({ tokens: [[{ content: "let", fontStyle: 2 }]] });

    expect(result).toHaveLength(1);
    expect(result[0]?.[0]?.content).toBe("let");
    expect(result[0]?.[0]?.fontStyle).toBe(2);
  });

  it("returns empty array for incompatible result shape", () => {
    expect(normalizeCodeToTokensResult({ tokens: [{ text: "oops" }] })).toEqual([]);
    expect(normalizeCodeToTokensResult(null)).toEqual([]);
    expect(normalizeCodeToTokensResult("invalid")).toEqual([]);
  });
});
