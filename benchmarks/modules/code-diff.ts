import { parseSerializableCodeDiff } from "../../src/mini-tool/code-diff/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "code-diff",
  parse: parseSerializableCodeDiff,
  verify: (input) => {
    const payload = input as { oldCode?: unknown; newCode?: unknown; patch?: unknown };
    const hasPatch = typeof payload.patch === "string";
    const hasFilePair = typeof payload.oldCode === "string" || typeof payload.newCode === "string";

    if (!hasPatch && !hasFilePair) {
      throw new Error("invalid code-diff mode");
    }

    if (hasPatch && hasFilePair) {
      throw new Error("mixed code-diff mode");
    }
  },
};

export default moduleDefinition;
