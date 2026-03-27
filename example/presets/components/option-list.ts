import type { MiniToolUiExampleClonePayload, MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyOptionListInitialPayload(
  element: MiniToolUiExamplePayloadTarget,
  clonePayload: MiniToolUiExampleClonePayload,
) {
  const initialOptionListPayload = {
    id: "option-list-preview-max-selections",
    selectionMode: "multi",
    minSelections: 1,
    maxSelections: 2,
    options: [
      { id: "good", label: "Good", description: "High quality work" },
      { id: "fast", label: "Fast", description: "Quick turnaround" },
      { id: "cheap", label: "Cheap", description: "Low cost" },
    ],
    actions: [
      { id: "cancel", label: "Reset" },
      { id: "confirm", label: "Confirm", variant: "default" },
    ],
  };

  element.payload = clonePayload(initialOptionListPayload);

  return {
    initialOptionListPayload,
  };
}
