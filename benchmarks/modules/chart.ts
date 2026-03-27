import { parseSerializableChart } from "../../src/mini-tool/chart/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "chart",
  parse: parseSerializableChart,
};

export default moduleDefinition;
