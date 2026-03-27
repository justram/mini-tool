import { parseSerializableTerminal } from "../../src/mini-tool/terminal/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "terminal",
  parse: parseSerializableTerminal,
};

export default moduleDefinition;
