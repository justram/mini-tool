import { parseSerializableCitationList } from "../../src/mini-tool/citation-list/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "citation-list",
  parse: parseSerializableCitationList,
};

export default moduleDefinition;
