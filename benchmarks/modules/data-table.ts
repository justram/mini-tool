import { parseSerializableDataTable } from "../../src/mini-tool/data-table/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "data-table",
  parse: parseSerializableDataTable,
};

export default moduleDefinition;
