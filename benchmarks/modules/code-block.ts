import { parseSerializableCodeBlock } from "../../src/mini-tool/code-block/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "code-block",
  parse: parseSerializableCodeBlock,
};

export default moduleDefinition;
