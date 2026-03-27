import { parseSerializablePreferencesPanel } from "../../src/mini-tool/preferences-panel/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "preferences-panel",
  parse: parseSerializablePreferencesPanel,
};

export default moduleDefinition;
