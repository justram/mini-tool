import { parseSerializableLinkPreview } from "../../src/mini-tool/link-preview/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "link-preview",
  parse: parseSerializableLinkPreview,
};

export default moduleDefinition;
