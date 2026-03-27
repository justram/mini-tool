import { parseSerializableOrderSummary } from "../../src/mini-tool/order-summary/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "order-summary",
  parse: parseSerializableOrderSummary,
};

export default moduleDefinition;
