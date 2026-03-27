import { parseSerializableStatsDisplay } from "../../src/mini-tool/stats-display/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "stats-display",
  parse: parseSerializableStatsDisplay,
};

export default moduleDefinition;
