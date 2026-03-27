import type { MiniToolUiExampleClonePayload, MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyPreferencesPanelInitialPayload(
  element: MiniToolUiExamplePayloadTarget,
  clonePayload: MiniToolUiExampleClonePayload,
) {
  const initialPreferencesPanelPayload = {
    id: "preferences-panel-workflow",
    title: "Automation Settings",
    sections: [
      {
        heading: "Task Rules",
        items: [
          {
            id: "auto-assign",
            label: "Auto-Assign Tasks",
            description: "Automatically assign based on workload",
            type: "switch",
            defaultChecked: true,
          },
          {
            id: "default-priority",
            label: "Default Priority",
            description: "Priority for new tasks",
            type: "select",
            selectOptions: [
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
              { value: "backlog", label: "Backlog" },
            ],
            defaultSelected: "medium",
          },
          {
            id: "notification-timing",
            label: "Notification Timing",
            description: "When to send reminders",
            type: "toggle",
            options: [
              { value: "instant", label: "Instant" },
              { value: "hourly", label: "Hourly" },
              { value: "daily", label: "Daily" },
            ],
            defaultValue: "instant",
          },
        ],
      },
    ],
    actions: [
      { id: "cancel", label: "Cancel", variant: "ghost" },
      { id: "save", label: "Save Changes", variant: "default" },
    ],
  };

  element.payload = clonePayload(initialPreferencesPanelPayload);

  return {
    initialPreferencesPanelPayload,
  };
}
