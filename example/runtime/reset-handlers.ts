import type { MiniToolUiExampleResetContext } from "./types.js";

export function bindResetHandlers({
  approvalCardResetButton,
  instagramPostResetButton,
  messageDraftResetButton,
  questionFlowResetButton,
  approvalCardElement,
  instagramPostElement,
  messageDraftElement,
  questionFlowElement,
  approvalReceipt,
  instagramReceipt,
  messageDraftReceipt,
  questionFlowReceipt,
  initialApprovalCardPayload,
  initialInstagramPostPayload,
  initialMessageDraftPayload,
  initialQuestionFlowPayload,
  clonePayload,
  refreshCardCode,
}: MiniToolUiExampleResetContext) {
  approvalCardResetButton.addEventListener("click", () => {
    approvalCardElement.payload = clonePayload(initialApprovalCardPayload);
    refreshCardCode("approval-card");
    approvalReceipt.textContent = "";
  });

  instagramPostResetButton.addEventListener("click", () => {
    instagramPostElement.payload = clonePayload(initialInstagramPostPayload);
    refreshCardCode("instagram-post");
    instagramReceipt.textContent = "";
  });

  messageDraftResetButton.addEventListener("click", () => {
    messageDraftElement.payload = clonePayload(initialMessageDraftPayload);
    refreshCardCode("message-draft");
    const draftElement = messageDraftElement as typeof messageDraftElement & { resetDraftState?: () => void };
    draftElement.resetDraftState?.();
    messageDraftReceipt.textContent = "";
  });

  questionFlowResetButton.addEventListener("click", () => {
    questionFlowElement.payload = clonePayload(initialQuestionFlowPayload);
    refreshCardCode("question-flow");
    questionFlowReceipt.textContent = "";
  });
}
