import type { MiniToolUiExampleClonePayload, MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyApprovalCardInitialPayload(
  element: MiniToolUiExamplePayloadTarget,
  clonePayload: MiniToolUiExampleClonePayload,
) {
  const initialApprovalCardPayload = {
    id: "approval-card-with-metadata",
    title: "Send Email Campaign",
    description: "Review the details before sending to your subscribers.",
    icon: "mail",
    metadata: [
      { key: "Recipients", value: "12,847 subscribers" },
      { key: "Subject", value: "Your Weekly Digest" },
      { key: "Scheduled", value: "Immediately" },
    ],
    confirmLabel: "Send Now",
  };

  element.payload = clonePayload(initialApprovalCardPayload);

  return {
    initialApprovalCardPayload,
  };
}
