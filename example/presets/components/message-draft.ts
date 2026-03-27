import type { MiniToolUiExampleClonePayload, MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyMessageDraftInitialPayload(
  element: MiniToolUiExamplePayloadTarget,
  clonePayload: MiniToolUiExampleClonePayload,
) {
  const initialMessageDraftPayload = {
    id: "message-draft-email",
    channel: "email",
    subject: "Q4 Planning Follow-up",
    from: "alex@acme.dev",
    to: ["sarah@acme.dev"],
    cc: ["ops@acme.dev"],
    body: `Hi Sarah,
    
    Thanks for joining today. I attached the updated timeline and budget notes.
    
    Please review and confirm if we should proceed with the draft by tomorrow morning.
    
    Best,
    Alex`,
    undoGracePeriod: 1200,
  };

  element.payload = clonePayload(initialMessageDraftPayload);

  return {
    initialMessageDraftPayload,
  };
}
