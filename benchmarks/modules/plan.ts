import { parseSerializablePlan } from "../../src/mini-tool/plan/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "plan",
  parse: parseSerializablePlan,
};

export default moduleDefinition;
