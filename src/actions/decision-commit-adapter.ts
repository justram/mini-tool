import { applyDecisionCommit } from "./decision-receipt.js";
import type { ApplyDecisionCommitByComponentOptions, DecisionReceipt } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function applyApprovalCardDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
): Record<string, unknown> {
  return {
    ...payload,
    choice: receipt.decision,
  };
}

function applyOptionListDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
): Record<string, unknown> {
  return applyDecisionCommit(payload, receipt);
}

function applyPreferencesPanelDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
): Record<string, unknown> {
  const choiceRecord = asRecord(receipt.decision) ?? {};

  return {
    ...payload,
    choice: { ...choiceRecord },
    receipt: receipt.receipt,
  };
}

function applyMessageDraftDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
): Record<string, unknown> {
  if (receipt.actionId === "send") {
    return {
      ...payload,
      outcome: "sent",
    };
  }

  if (receipt.actionId === "cancel") {
    return {
      ...payload,
      outcome: "cancelled",
    };
  }

  return payload;
}

function applyQuestionFlowDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
  options: ApplyDecisionCommitByComponentOptions,
): Record<string, unknown> {
  const answers = asRecord(receipt.decision) ?? {};
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const emptyValueLabel = options.questionFlowEmptyValueLabel ?? "None";

  const summaryFromSteps = steps
    .map((stepValue) => {
      const step = asRecord(stepValue);
      if (!step) {
        return null;
      }

      const stepId = asString(step.id);
      const stepTitle = asString(step.title);
      const stepOptions = Array.isArray(step.options) ? step.options : [];
      if (!stepId || !stepTitle) {
        return null;
      }

      const selectedIds = asStringArray(answers[stepId]);
      const selectedLabels = stepOptions
        .map((optionValue) => asRecord(optionValue))
        .filter((option): option is Record<string, unknown> => option !== null)
        .filter((option) => selectedIds.includes(asString(option.id) ?? ""))
        .map((option) => asString(option.label))
        .filter((label): label is string => label !== null)
        .join(", ");

      return {
        label: stepTitle,
        value: selectedLabels || emptyValueLabel,
      };
    })
    .filter((item): item is { label: string; value: string } => item !== null);

  const summary =
    summaryFromSteps.length > 0
      ? summaryFromSteps
      : Object.entries(answers).map(([stepId, value]) => {
          const selectedIds = asStringArray(value);
          return {
            label: stepId,
            value: selectedIds.length > 0 ? selectedIds.join(", ") : emptyValueLabel,
          };
        });

  const nextId = asString(payload.id) ?? receipt.componentId;
  const nextRole = asString(payload.role);

  return {
    id: nextId,
    ...(nextRole ? { role: nextRole } : {}),
    choice: {
      title: options.questionFlowTitle ?? "Completed",
      summary,
    },
    receipt: receipt.receipt,
  };
}

function applyOrderSummaryDecisionCommit(
  payload: Record<string, unknown>,
  receipt: DecisionReceipt,
): Record<string, unknown> {
  const existingDecision = asRecord(receipt.decision);
  const orderId = asString(existingDecision?.orderId) ?? asString(receipt.receipt.identifiers?.orderId);
  const confirmedAt = asString(existingDecision?.confirmedAt) ?? receipt.receipt.at;

  return {
    ...payload,
    variant: "receipt",
    choice: {
      action: "confirm",
      ...(orderId ? { orderId } : {}),
      confirmedAt,
    },
  };
}

const DECISION_COMMIT_ADAPTERS: Record<
  string,
  (
    payload: Record<string, unknown>,
    receipt: DecisionReceipt,
    options: ApplyDecisionCommitByComponentOptions,
  ) => Record<string, unknown>
> = {
  "approval-card": (payload, receipt) => applyApprovalCardDecisionCommit(payload, receipt),
  "message-draft": (payload, receipt) => applyMessageDraftDecisionCommit(payload, receipt),
  "option-list": (payload, receipt) => applyOptionListDecisionCommit(payload, receipt),
  "order-summary": (payload, receipt) => applyOrderSummaryDecisionCommit(payload, receipt),
  "preferences-panel": (payload, receipt) => applyPreferencesPanelDecisionCommit(payload, receipt),
  "question-flow": (payload, receipt, options) => applyQuestionFlowDecisionCommit(payload, receipt, options),
};

export function applyDecisionCommitByComponent<TPayload extends Record<string, unknown>>(
  component: string,
  payload: TPayload,
  receipt: DecisionReceipt,
  options: ApplyDecisionCommitByComponentOptions = {},
): TPayload {
  const adapter = DECISION_COMMIT_ADAPTERS[component];
  if (!adapter) {
    if (options.allowGenericFallback) {
      return applyDecisionCommit(payload, receipt, options);
    }

    throw new Error(
      `No DecisionCommitAdapter is registered for component '${component}'. Provide an adapter or set allowGenericFallback=true.`,
    );
  }

  return adapter(payload, receipt, options) as TPayload;
}
