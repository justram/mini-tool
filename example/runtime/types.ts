import type {
  MiniToolUiExampleElementId,
  MiniToolUiExampleHarnessCard,
  MiniToolUiExampleReceiptId,
  MiniToolUiExampleResetButtonId,
} from "../harness-config.js";
import type {
  MiniToolUiExampleClonePayload,
  MiniToolUiExamplePayloadTarget,
  MiniToolUiExampleResetPayloads,
} from "../presets/types.js";

export type MiniToolUiExampleMode = "preview" | "code";

export type MiniToolUiExampleComponentElement = HTMLElement & MiniToolUiExamplePayloadTarget;

export type MiniToolUiExampleCodeRendererElement = HTMLElement & {
  payload: {
    id: string;
    code: string;
    language: string;
    lineNumbers: "hidden";
  };
};

export type MiniToolUiExampleHarnessRuntime = {
  mustGetComponentElement: (id: MiniToolUiExampleElementId) => MiniToolUiExampleComponentElement;
  mustGetReceipt: (id: MiniToolUiExampleReceiptId) => HTMLParagraphElement;
  mustGetResetButton: (id: MiniToolUiExampleResetButtonId) => HTMLButtonElement;
  getCardByElementId: (elementId: MiniToolUiExampleElementId) => MiniToolUiExampleHarnessCard | undefined;
  getComponentElement: (elementId: MiniToolUiExampleElementId) => MiniToolUiExampleComponentElement | undefined;
  getCodeRenderer: (elementId: MiniToolUiExampleElementId) => MiniToolUiExampleCodeRendererElement | undefined;
  setCardDisplayMode: (elementId: MiniToolUiExampleElementId, mode: MiniToolUiExampleMode) => void;
  setAllCardsDisplayMode: (mode: MiniToolUiExampleMode) => void;
};

export type RefreshCardCode = (elementId: MiniToolUiExampleElementId) => void;

export type MiniToolUiExampleResetContext = {
  approvalCardResetButton: HTMLButtonElement;
  instagramPostResetButton: HTMLButtonElement;
  messageDraftResetButton: HTMLButtonElement;
  questionFlowResetButton: HTMLButtonElement;
  approvalCardElement: MiniToolUiExampleComponentElement;
  instagramPostElement: MiniToolUiExampleComponentElement;
  messageDraftElement: MiniToolUiExampleComponentElement;
  questionFlowElement: MiniToolUiExampleComponentElement;
  approvalReceipt: HTMLParagraphElement;
  instagramReceipt: HTMLParagraphElement;
  messageDraftReceipt: HTMLParagraphElement;
  questionFlowReceipt: HTMLParagraphElement;
  initialApprovalCardPayload: MiniToolUiExampleResetPayloads["initialApprovalCardPayload"];
  initialInstagramPostPayload: MiniToolUiExampleResetPayloads["initialInstagramPostPayload"];
  initialMessageDraftPayload: MiniToolUiExampleResetPayloads["initialMessageDraftPayload"];
  initialQuestionFlowPayload: MiniToolUiExampleResetPayloads["initialQuestionFlowPayload"];
  clonePayload: MiniToolUiExampleClonePayload;
  refreshCardCode: RefreshCardCode;
};

export type MiniToolUiExampleActionsContext = {
  optionListElement: MiniToolUiExampleComponentElement;
  approvalCardElement: MiniToolUiExampleComponentElement;
  messageDraftElement: MiniToolUiExampleComponentElement;
  preferencesPanelElement: MiniToolUiExampleComponentElement;
  questionFlowElement: MiniToolUiExampleComponentElement;
  receipt: HTMLParagraphElement;
  approvalReceipt: HTMLParagraphElement;
  chartReceipt: HTMLParagraphElement;
  instagramReceipt: HTMLParagraphElement;
  messageDraftReceipt: HTMLParagraphElement;
  parameterSliderReceipt: HTMLParagraphElement;
  preferencesPanelReceipt: HTMLParagraphElement;
  itemCarouselReceipt: HTMLParagraphElement;
  questionFlowReceipt: HTMLParagraphElement;
  initialPreferencesPanelPayload: MiniToolUiExampleResetPayloads["initialPreferencesPanelPayload"];
  initialQuestionFlowPayload: MiniToolUiExampleResetPayloads["initialQuestionFlowPayload"];
  refreshCardCode: RefreshCardCode;
  clonePayload: MiniToolUiExampleClonePayload;
};
