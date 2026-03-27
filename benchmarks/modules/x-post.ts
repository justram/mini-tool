import { parseSerializableXPost } from "../../src/mini-tool/x-post/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "x-post",
  parse: parseSerializableXPost,
};

export default moduleDefinition;
