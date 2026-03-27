import { parseSerializableVideo } from "../../src/mini-tool/video/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "video",
  parse: parseSerializableVideo,
};

export default moduleDefinition;
