import {
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceiptFromAction,
} from "mini-toolui/actions";
import type { MiniToolUiExampleActionsContext } from "./types.js";

type MiniToolUiExampleRuntimeAction = {
  component: string;
  actionId: string;
  state?: Record<string, unknown>;
  decision?: unknown;
};

function formatActionStateValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function formatRecordSummary(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  return Object.entries(value)
    .map(([key, entryValue]) => `${key}=${String(entryValue)}`)
    .join(", ");
}

export function bindMiniToolUiExampleActions(context: MiniToolUiExampleActionsContext) {
  const {
    optionListElement,
    approvalCardElement,
    messageDraftElement,
    preferencesPanelElement,
    questionFlowElement,
    receipt,
    approvalReceipt,
    chartReceipt,
    instagramReceipt,
    messageDraftReceipt,
    parameterSliderReceipt,
    preferencesPanelReceipt,
    itemCarouselReceipt,
    questionFlowReceipt,
    initialPreferencesPanelPayload,
    initialQuestionFlowPayload,
    refreshCardCode,
    clonePayload,
  } = context;

  return bindMiniToolActions(document, {
    onLocalAction: (action) => {
      const runtimeAction = action as MiniToolUiExampleRuntimeAction;

      if (runtimeAction.component === "option-list" && runtimeAction.actionId !== "confirm") {
        receipt.textContent = "";
        return;
      }

      if (runtimeAction.component === "parameter-slider") {
        const values = runtimeAction.state?.values;
        const valuesText = Array.isArray(values) ? values.map((item) => `${item.id}: ${item.value}`).join(", ") : "";
        parameterSliderReceipt.textContent = `${runtimeAction.actionId}: ${valuesText}`;
        return;
      }

      if (runtimeAction.component === "preferences-panel") {
        const summary = formatRecordSummary(runtimeAction.state?.value);
        preferencesPanelReceipt.textContent = `${runtimeAction.actionId}: ${summary}`;
        return;
      }

      if (runtimeAction.component === "chart") {
        chartReceipt.textContent = `${runtimeAction.state?.seriesLabel} @ ${runtimeAction.state?.xValue}: ${runtimeAction.state?.yValue}`;
        return;
      }

      if (runtimeAction.component === "instagram-post") {
        instagramReceipt.textContent = `Action: ${runtimeAction.actionId}`;
        return;
      }

      if (runtimeAction.component === "message-draft") {
        if (runtimeAction.actionId === "undo") {
          messageDraftReceipt.textContent = "Send undone";
          return;
        }

        if (runtimeAction.actionId === "cancel") {
          messageDraftElement.payload = {
            ...(messageDraftElement.payload as Record<string, unknown>),
            outcome: "cancelled",
          };
          refreshCardCode("message-draft");
          messageDraftReceipt.textContent = "Draft cancelled";
        }

        return;
      }

      if (runtimeAction.component === "item-carousel") {
        if (runtimeAction.actionId === "item-click") {
          itemCarouselReceipt.textContent = `Open: ${formatActionStateValue(runtimeAction.decision)}`;
          return;
        }

        itemCarouselReceipt.textContent = `Action: ${formatActionStateValue(runtimeAction.decision)} · ${runtimeAction.actionId}`;
      }
    },
    onDecisionAction: (action) => {
      const runtimeAction = action as MiniToolUiExampleRuntimeAction;
      const decisionReceipt = createDecisionReceiptFromAction(action, {
        summary: `${runtimeAction.component}:${runtimeAction.actionId}`,
      });

      if (runtimeAction.component === "option-list") {
        receipt.textContent = `Confirmed: ${formatActionStateValue(runtimeAction.decision)}`;
        optionListElement.payload = applyDecisionCommitByComponent(
          "option-list",
          optionListElement.payload as Record<string, unknown>,
          decisionReceipt,
        );
        refreshCardCode("option-list");
      }

      if (runtimeAction.component === "approval-card") {
        approvalReceipt.textContent = `Decision: ${formatActionStateValue(runtimeAction.decision)}`;
        approvalCardElement.payload = applyDecisionCommitByComponent(
          "approval-card",
          approvalCardElement.payload as Record<string, unknown>,
          decisionReceipt,
        );
        refreshCardCode("approval-card");
      }

      if (runtimeAction.component === "parameter-slider") {
        const values = runtimeAction.state?.values;
        const valuesText = Array.isArray(values) ? values.map((item) => `${item.id}: ${item.value}`).join(", ") : "";
        parameterSliderReceipt.textContent = `${runtimeAction.actionId}: ${valuesText}`;
      }

      if (runtimeAction.component === "preferences-panel") {
        const summary = formatRecordSummary(runtimeAction.state?.value);
        preferencesPanelReceipt.textContent = `${runtimeAction.actionId}: ${summary}`;
        preferencesPanelElement.payload = applyDecisionCommitByComponent(
          "preferences-panel",
          {
            id: initialPreferencesPanelPayload.id,
            title: initialPreferencesPanelPayload.title,
            sections: clonePayload(initialPreferencesPanelPayload.sections),
          },
          decisionReceipt,
        );
        refreshCardCode("preferences-panel");
      }

      if (runtimeAction.component === "message-draft" && runtimeAction.actionId === "send") {
        messageDraftElement.payload = applyDecisionCommitByComponent(
          "message-draft",
          messageDraftElement.payload as Record<string, unknown>,
          decisionReceipt,
        );
        refreshCardCode("message-draft");
        messageDraftReceipt.textContent = "Message sent";
      }

      if (runtimeAction.component === "question-flow" && runtimeAction.actionId === "complete") {
        const answers = runtimeAction.state?.answers;
        const entries = Object.entries((answers ?? {}) as Record<string, unknown>);
        const summary = entries
          .map(([stepId, selections]) => `${stepId}=[${((selections as string[]) ?? []).join(",")}]`)
          .join("; ");
        questionFlowReceipt.textContent = `Complete: ${summary}`;

        questionFlowElement.payload = applyDecisionCommitByComponent(
          "question-flow",
          clonePayload(initialQuestionFlowPayload),
          decisionReceipt,
          {
            questionFlowTitle: "Project configured",
          },
        );
        refreshCardCode("question-flow");
      }

      return decisionReceipt;
    },
  });
}
