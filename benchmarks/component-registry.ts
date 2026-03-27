export const benchmarkComponents = [
  "approval-card",
  "audio",
  "chart",
  "citation",
  "citation-list",
  "code-block",
  "code-diff",
  "data-table",
  "image",
  "item-carousel",
  "image-gallery",
  "geo-map",
  "instagram-post",
  "link-preview",
  "linkedin-post",
  "message-draft",
  "option-list",
  "order-summary",
  "parameter-slider",
  "plan",
  "preferences-panel",
  "progress-tracker",
  "question-flow",
  "stats-display",
  "terminal",
  "video",
  "x-post",
] as const;

export type BenchmarkComponent = (typeof benchmarkComponents)[number];

const benchmarkComponentSet = new Set<string>(benchmarkComponents);

export function isBenchmarkComponent(component: string): component is BenchmarkComponent {
  return benchmarkComponentSet.has(component);
}
