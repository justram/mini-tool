import { parseSerializableItemCarousel } from "../../src/mini-tool/item-carousel/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "item-carousel",
  parse: parseSerializableItemCarousel,
};

export default moduleDefinition;
