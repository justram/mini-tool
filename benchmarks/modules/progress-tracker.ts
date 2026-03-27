import { parseSerializableProgressTracker } from "../../src/mini-tool/progress-tracker/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "progress-tracker",
  parse: parseSerializableProgressTracker,
};

export default moduleDefinition;
