import type { MiniToolReceiptOutcome } from "../shared/schema.js";
import type {
  ApplyDecisionCommitOptions,
  DecisionReceipt,
  DecisionReceiptOptions,
  MiniToolActionEnvelope,
} from "./types.js";

export function createDecisionReceipt<TDecision>(
  input: {
    component: string;
    componentId: string;
    actionId: string;
    decision: TDecision;
  },
  options: DecisionReceiptOptions = {},
): DecisionReceipt<TDecision> {
  const outcome: MiniToolReceiptOutcome = options.outcome ?? "success";
  const at = options.at ?? new Date().toISOString();

  return {
    type: "decision",
    component: input.component,
    componentId: input.componentId,
    actionId: input.actionId,
    decision: input.decision,
    receipt: {
      outcome,
      summary: options.summary ?? `${input.component}:${input.actionId}`,
      identifiers: {
        componentId: input.componentId,
        actionId: input.actionId,
        ...(options.identifiers ?? {}),
      },
      at,
    },
  };
}

export function createDecisionReceiptFromAction(
  action: MiniToolActionEnvelope,
  options: DecisionReceiptOptions = {},
): DecisionReceipt {
  return createDecisionReceipt(
    {
      component: action.component,
      componentId: action.componentId,
      actionId: action.actionId,
      decision: action.decision,
    },
    options,
  );
}

export function applyDecisionCommit<TPayload extends Record<string, unknown>>(
  payload: TPayload,
  receipt: DecisionReceipt,
  options: ApplyDecisionCommitOptions = {},
): TPayload {
  const next = { ...payload } as Record<string, unknown>;
  next.receipt = receipt.receipt;

  const includeChoice = options.includeChoice ?? true;
  if (includeChoice) {
    const choiceKey = options.choiceKey ?? "choice";
    next[choiceKey] = receipt.decision;
  }

  return next as TPayload;
}
