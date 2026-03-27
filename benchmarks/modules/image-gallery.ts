import { parseSerializableImageGallery } from "../../src/mini-tool/image-gallery/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "image-gallery",
  parse: parseSerializableImageGallery,
};

export default moduleDefinition;
