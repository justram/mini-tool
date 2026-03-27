import { parseSerializableCitation } from "../../src/mini-tool/citation/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "citation",
  parse: parseSerializableCitation,
};

export default moduleDefinition;
