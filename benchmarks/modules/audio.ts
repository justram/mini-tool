import { parseSerializableAudio } from "../../src/mini-tool/audio/schema";
import type { BenchmarkModule } from "./shared";

const moduleDefinition: BenchmarkModule = {
  component: "audio",
  parse: parseSerializableAudio,
};

export default moduleDefinition;
