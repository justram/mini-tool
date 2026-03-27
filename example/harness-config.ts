export type MiniToolUiExampleHarnessCard = {
  component: string;
  tagName: string;
  elementId: string;
  testId: string;
  variantId?: string;
  resetButtonId?: string;
  receiptId?: string;
};

export const MINI_TOOLUI_EXAMPLE_HARNESS_CARDS = [
  {
    component: "link-preview",
    tagName: "mini-tool-link-preview",
    elementId: "link-preview",
    testId: "link-preview-card",
  },
  { component: "image", tagName: "mini-tool-image", elementId: "image", testId: "image-card" },
  { component: "audio", tagName: "mini-tool-audio", elementId: "audio", testId: "audio-card" },
  { component: "video", tagName: "mini-tool-video", elementId: "video", testId: "video-card" },
  { component: "citation", tagName: "mini-tool-citation", elementId: "citation", testId: "citation-card" },
  {
    component: "citation-list",
    tagName: "mini-tool-citation-list",
    elementId: "citation-list",
    testId: "citation-list-card",
  },
  {
    component: "progress-tracker",
    tagName: "mini-tool-progress-tracker",
    elementId: "progress-tracker",
    testId: "progress-tracker-card",
  },
  {
    component: "option-list",
    tagName: "mini-tool-option-list",
    elementId: "option-list",
    testId: "option-list-card",
    receiptId: "receipt",
  },
  {
    component: "approval-card",
    tagName: "mini-tool-approval-card",
    elementId: "approval-card",
    testId: "approval-card-card",
    resetButtonId: "approval-card-reset",
    receiptId: "approval-receipt",
  },
  {
    component: "order-summary",
    tagName: "mini-tool-order-summary",
    elementId: "order-summary",
    testId: "order-summary-card",
  },
  {
    component: "data-table",
    tagName: "mini-tool-data-table",
    elementId: "data-table",
    testId: "data-table-card",
  },
  {
    component: "stats-display",
    tagName: "mini-tool-stats-display",
    elementId: "stats-display",
    testId: "stats-display-card",
  },
  {
    component: "chart",
    variantId: "default",
    tagName: "mini-tool-chart",
    elementId: "chart",
    testId: "chart-card",
    receiptId: "chart-receipt",
  },
  {
    component: "chart",
    variantId: "line",
    tagName: "mini-tool-chart",
    elementId: "chart-line",
    testId: "chart-line-card",
  },
  { component: "x-post", tagName: "mini-tool-x-post", elementId: "x-post", testId: "x-post-card" },
  {
    component: "instagram-post",
    tagName: "mini-tool-instagram-post",
    elementId: "instagram-post",
    testId: "instagram-post-card",
    resetButtonId: "instagram-post-reset",
    receiptId: "instagram-receipt",
  },
  {
    component: "linkedin-post",
    tagName: "mini-tool-linkedin-post",
    elementId: "linkedin-post",
    testId: "linkedin-post-card",
  },
  {
    component: "code-block",
    variantId: "default",
    tagName: "mini-tool-code-block",
    elementId: "code-block",
    testId: "code-block-card",
  },
  {
    component: "code-block",
    variantId: "collapsible",
    tagName: "mini-tool-code-block",
    elementId: "code-block-collapsible",
    testId: "code-block-collapsible-card",
  },
  {
    component: "code-diff",
    variantId: "unified",
    tagName: "mini-tool-code-diff",
    elementId: "code-diff",
    testId: "code-diff-card",
  },
  {
    component: "code-diff",
    variantId: "split",
    tagName: "mini-tool-code-diff",
    elementId: "code-diff-split",
    testId: "code-diff-split-card",
  },
  {
    component: "parameter-slider",
    tagName: "mini-tool-parameter-slider",
    elementId: "parameter-slider",
    testId: "parameter-slider-card",
    receiptId: "parameter-slider-receipt",
  },
  { component: "plan", tagName: "mini-tool-plan", elementId: "plan", testId: "plan-card" },
  {
    component: "preferences-panel",
    tagName: "mini-tool-preferences-panel",
    elementId: "preferences-panel",
    testId: "preferences-panel-card",
    receiptId: "preferences-panel-receipt",
  },
  {
    component: "message-draft",
    tagName: "mini-tool-message-draft",
    elementId: "message-draft",
    testId: "message-draft-card",
    resetButtonId: "message-draft-reset",
    receiptId: "message-draft-receipt",
  },
  {
    component: "terminal",
    variantId: "default",
    tagName: "mini-tool-terminal",
    elementId: "terminal",
    testId: "terminal-card",
  },
  {
    component: "terminal",
    variantId: "collapsible",
    tagName: "mini-tool-terminal",
    elementId: "terminal-collapsible",
    testId: "terminal-collapsible-card",
  },
  {
    component: "image-gallery",
    tagName: "mini-tool-image-gallery",
    elementId: "image-gallery",
    testId: "image-gallery-card",
  },
  {
    component: "item-carousel",
    tagName: "mini-tool-item-carousel",
    elementId: "item-carousel",
    testId: "item-carousel-card",
    receiptId: "item-carousel-receipt",
  },
  {
    component: "question-flow",
    tagName: "mini-tool-question-flow",
    elementId: "question-flow",
    testId: "question-flow-card",
    resetButtonId: "question-flow-reset",
    receiptId: "question-flow-receipt",
  },
  {
    component: "geo-map",
    tagName: "mini-tool-geo-map",
    elementId: "geo-map",
    testId: "geo-map-card",
  },
] as const satisfies readonly MiniToolUiExampleHarnessCard[];

export type MiniToolUiExampleElementId = (typeof MINI_TOOLUI_EXAMPLE_HARNESS_CARDS)[number]["elementId"];
export type MiniToolUiExampleResetButtonId = Exclude<MiniToolUiExampleHarnessCard["resetButtonId"], undefined>;
export type MiniToolUiExampleReceiptId = Exclude<MiniToolUiExampleHarnessCard["receiptId"], undefined>;
