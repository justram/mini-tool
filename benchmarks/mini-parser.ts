import { type BenchmarkComponent, benchmarkComponents, isBenchmarkComponent } from "./component-registry";

type ParseFn = (input: unknown) => unknown;
type ParserLoader = () => Promise<ParseFn>;

const miniParserLoaders: Record<BenchmarkComponent, ParserLoader> = {
  "approval-card": async () => {
    const mod = await import("../src/mini-tool/approval-card/schema");
    return mod.parseSerializableApprovalCard;
  },
  audio: async () => {
    const mod = await import("../src/mini-tool/audio/schema");
    return mod.parseSerializableAudio;
  },
  chart: async () => {
    const mod = await import("../src/mini-tool/chart/schema");
    return mod.parseSerializableChart;
  },
  citation: async () => {
    const mod = await import("../src/mini-tool/citation/schema");
    return mod.parseSerializableCitation;
  },
  "citation-list": async () => {
    const mod = await import("../src/mini-tool/citation-list/schema");
    return mod.parseSerializableCitationList;
  },
  "code-block": async () => {
    const mod = await import("../src/mini-tool/code-block/schema");
    return mod.parseSerializableCodeBlock;
  },
  "code-diff": async () => {
    const mod = await import("../src/mini-tool/code-diff/schema");
    return mod.parseSerializableCodeDiff;
  },
  "data-table": async () => {
    const mod = await import("../src/mini-tool/data-table/schema");
    return mod.parseSerializableDataTable;
  },
  image: async () => {
    const mod = await import("../src/mini-tool/image/schema");
    return mod.parseSerializableImage;
  },
  "image-gallery": async () => {
    const mod = await import("../src/mini-tool/image-gallery/schema");
    return mod.parseSerializableImageGallery;
  },
  "geo-map": async () => {
    const mod = await import("../src/mini-tool/geo-map/schema");
    return mod.parseSerializableGeoMap;
  },
  "instagram-post": async () => {
    const mod = await import("../src/mini-tool/instagram-post/schema");
    return mod.parseSerializableInstagramPost;
  },
  "item-carousel": async () => {
    const mod = await import("../src/mini-tool/item-carousel/schema");
    return mod.parseSerializableItemCarousel;
  },
  "link-preview": async () => {
    const mod = await import("../src/mini-tool/link-preview/schema");
    return mod.parseSerializableLinkPreview;
  },
  "linkedin-post": async () => {
    const mod = await import("../src/mini-tool/linkedin-post/schema");
    return mod.parseSerializableLinkedInPost;
  },
  "message-draft": async () => {
    const mod = await import("../src/mini-tool/message-draft/schema");
    return mod.parseSerializableMessageDraft;
  },
  "option-list": async () => {
    const mod = await import("../src/mini-tool/option-list/schema");
    return mod.parseSerializableOptionList;
  },
  "order-summary": async () => {
    const mod = await import("../src/mini-tool/order-summary/schema");
    return mod.parseSerializableOrderSummary;
  },
  "parameter-slider": async () => {
    const mod = await import("../src/mini-tool/parameter-slider/schema");
    return mod.parseSerializableParameterSlider;
  },
  plan: async () => {
    const mod = await import("../src/mini-tool/plan/schema");
    return mod.parseSerializablePlan;
  },
  "preferences-panel": async () => {
    const mod = await import("../src/mini-tool/preferences-panel/schema");
    return mod.parseSerializablePreferencesPanel;
  },
  "progress-tracker": async () => {
    const mod = await import("../src/mini-tool/progress-tracker/schema");
    return mod.parseSerializableProgressTracker;
  },
  "question-flow": async () => {
    const mod = await import("../src/mini-tool/question-flow/schema");
    return mod.parseSerializableQuestionFlow;
  },
  "stats-display": async () => {
    const mod = await import("../src/mini-tool/stats-display/schema");
    return mod.parseSerializableStatsDisplay;
  },
  terminal: async () => {
    const mod = await import("../src/mini-tool/terminal/schema");
    return mod.parseSerializableTerminal;
  },
  video: async () => {
    const mod = await import("../src/mini-tool/video/schema");
    return mod.parseSerializableVideo;
  },
  "x-post": async () => {
    const mod = await import("../src/mini-tool/x-post/schema");
    return mod.parseSerializableXPost;
  },
};

export async function getMiniParser(component: string): Promise<ParseFn> {
  if (!isBenchmarkComponent(component)) {
    throw new Error(`Unsupported mini parser component: ${component}`);
  }

  return miniParserLoaders[component]();
}

export function supportedMiniBenchmarkComponents(): string[] {
  return benchmarkComponents.slice().sort();
}
