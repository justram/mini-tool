import { parseSerializableQuestionFlow } from "../../src/mini-tool/question-flow/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "question-flow",
  parse: parseSerializableQuestionFlow,
};

export default moduleDefinition;
