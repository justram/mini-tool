import { parseSerializableMessageDraft } from "../../src/mini-tool/message-draft/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "message-draft",
  parse: parseSerializableMessageDraft,
};

export default moduleDefinition;
