import { parseSerializableParameterSlider } from "../../src/mini-tool/parameter-slider/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "parameter-slider",
  parse: parseSerializableParameterSlider,
};

export default moduleDefinition;
