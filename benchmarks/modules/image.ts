import { parseSerializableImage } from "../../src/mini-tool/image/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "image",
  parse: parseSerializableImage,
};

export default moduleDefinition;
