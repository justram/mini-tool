import { parseSerializableInstagramPost } from "../../src/mini-tool/instagram-post/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "instagram-post",
  parse: parseSerializableInstagramPost,
};

export default moduleDefinition;
