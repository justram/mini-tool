import { parseSerializableApprovalCard } from "../../src/mini-tool/approval-card/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "approval-card",
  parse: parseSerializableApprovalCard,
};

export default moduleDefinition;
