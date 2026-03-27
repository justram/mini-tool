import type { MiniToolUiExampleElementId } from "../harness-config.js";
import { applyApprovalCardInitialPayload } from "./components/approval-card.js";
import { applyAudioInitialPayload } from "./components/audio.js";
import { applyChartInitialPayload } from "./components/chart.js";
import { applyChartLineInitialPayload } from "./components/chart-line.js";
import { applyCitationInitialPayload } from "./components/citation.js";
import { applyCitationListInitialPayload } from "./components/citation-list.js";
import { applyCodeBlockInitialPayload } from "./components/code-block.js";
import { applyCodeBlockCollapsibleInitialPayload } from "./components/code-block-collapsible.js";
import { applyCodeDiffInitialPayload } from "./components/code-diff.js";
import { applyCodeDiffSplitInitialPayload } from "./components/code-diff-split.js";
import { applyDataTableInitialPayload } from "./components/data-table.js";
import { applyGeoMapInitialPayload } from "./components/geo-map.js";
import { applyImageInitialPayload } from "./components/image.js";
import { applyImageGalleryInitialPayload } from "./components/image-gallery.js";
import { applyInstagramPostInitialPayload } from "./components/instagram-post.js";
import { applyItemCarouselInitialPayload } from "./components/item-carousel.js";
import { applyLinkPreviewInitialPayload } from "./components/link-preview.js";
import { applyLinkedinPostInitialPayload } from "./components/linkedin-post.js";
import { applyMessageDraftInitialPayload } from "./components/message-draft.js";
import { applyOptionListInitialPayload } from "./components/option-list.js";
import { applyOrderSummaryInitialPayload } from "./components/order-summary.js";
import { applyParameterSliderInitialPayload } from "./components/parameter-slider.js";
import { applyPlanInitialPayload } from "./components/plan.js";
import { applyPreferencesPanelInitialPayload } from "./components/preferences-panel.js";
import { applyProgressTrackerInitialPayload } from "./components/progress-tracker.js";
import { applyQuestionFlowInitialPayload } from "./components/question-flow.js";
import { applyStatsDisplayInitialPayload } from "./components/stats-display.js";
import { applyTerminalInitialPayload } from "./components/terminal.js";
import { applyTerminalCollapsibleInitialPayload } from "./components/terminal-collapsible.js";
import { applyVideoInitialPayload } from "./components/video.js";
import { applyXPostInitialPayload } from "./components/x-post.js";
import type {
  MiniToolUiExampleClonePayload,
  MiniToolUiExamplePayloadTarget,
  MiniToolUiExampleResetPayloads,
} from "./types.js";

export type PresetApplyResult = Partial<MiniToolUiExampleResetPayloads>;

export type PresetEntry = {
  elementId: MiniToolUiExampleElementId;
  apply: (element: MiniToolUiExamplePayloadTarget, clonePayload: MiniToolUiExampleClonePayload) => unknown;
};

export const PRESET_ENTRIES: readonly PresetEntry[] = [
  { elementId: "link-preview", apply: applyLinkPreviewInitialPayload },
  { elementId: "image", apply: applyImageInitialPayload },
  { elementId: "audio", apply: applyAudioInitialPayload },
  { elementId: "video", apply: applyVideoInitialPayload },
  { elementId: "citation", apply: applyCitationInitialPayload },
  { elementId: "citation-list", apply: applyCitationListInitialPayload },
  { elementId: "progress-tracker", apply: applyProgressTrackerInitialPayload },
  { elementId: "option-list", apply: applyOptionListInitialPayload },
  { elementId: "approval-card", apply: applyApprovalCardInitialPayload },
  { elementId: "order-summary", apply: applyOrderSummaryInitialPayload },
  { elementId: "data-table", apply: applyDataTableInitialPayload },
  { elementId: "stats-display", apply: applyStatsDisplayInitialPayload },
  { elementId: "chart", apply: applyChartInitialPayload },
  { elementId: "chart-line", apply: applyChartLineInitialPayload },
  { elementId: "x-post", apply: applyXPostInitialPayload },
  { elementId: "instagram-post", apply: applyInstagramPostInitialPayload },
  { elementId: "linkedin-post", apply: applyLinkedinPostInitialPayload },
  { elementId: "code-block", apply: applyCodeBlockInitialPayload },
  { elementId: "code-block-collapsible", apply: applyCodeBlockCollapsibleInitialPayload },
  { elementId: "code-diff", apply: applyCodeDiffInitialPayload },
  { elementId: "code-diff-split", apply: applyCodeDiffSplitInitialPayload },
  { elementId: "message-draft", apply: applyMessageDraftInitialPayload },
  { elementId: "parameter-slider", apply: applyParameterSliderInitialPayload },
  { elementId: "plan", apply: applyPlanInitialPayload },
  { elementId: "preferences-panel", apply: applyPreferencesPanelInitialPayload },
  { elementId: "terminal", apply: applyTerminalInitialPayload },
  { elementId: "terminal-collapsible", apply: applyTerminalCollapsibleInitialPayload },
  { elementId: "image-gallery", apply: applyImageGalleryInitialPayload },
  { elementId: "item-carousel", apply: applyItemCarouselInitialPayload },
  { elementId: "question-flow", apply: applyQuestionFlowInitialPayload },
  { elementId: "geo-map", apply: applyGeoMapInitialPayload },
];
