import { parseSerializableOptionList } from "../../src/mini-tool/option-list/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "option-list",
  parse: parseSerializableOptionList,
};

export default moduleDefinition;
