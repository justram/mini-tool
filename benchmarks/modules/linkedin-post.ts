import { parseSerializableLinkedInPost } from "../../src/mini-tool/linkedin-post/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "linkedin-post",
  parse: parseSerializableLinkedInPost,
};

export default moduleDefinition;
