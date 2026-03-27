import { parseSerializableGeoMap } from "../../src/mini-tool/geo-map/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "geo-map",
  parse: parseSerializableGeoMap,
};

export default moduleDefinition;
