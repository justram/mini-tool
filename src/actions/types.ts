import type { MiniToolReceipt, MiniToolReceiptOutcome } from "../shared/schema.js";

export type MiniToolActionKind = "local" | "decision";

export type MiniToolActionEnvelope<TState = unknown, TDecision = unknown> = {
  component: string;
  componentId: string;
  actionId: string;
  kind: MiniToolActionKind;
  state: TState;
  decision?: TDecision;
  rawEvent: Event;
};

export type DecisionReceipt<TDecision = unknown> = {
  type: "decision";
  component: string;
  componentId: string;
  actionId: string;
  decision: TDecision;
  receipt: MiniToolReceipt;
};

export type DecisionReceiptOptions = {
  summary?: string;
  outcome?: MiniToolReceiptOutcome;
  at?: string;
  identifiers?: Record<string, string>;
};

export type BindMiniToolActionsHandlers = {
  onLocalAction?: (action: MiniToolActionEnvelope) => void | Promise<void>;
  onDecisionAction?: (action: MiniToolActionEnvelope) => DecisionReceipt | Promise<DecisionReceipt>;
  commitDecision?: (receipt: DecisionReceipt) => void | Promise<void>;
};

export type BindMiniToolActionsOptions = {
  classificationOverride?: Record<string, MiniToolActionKind>;
  eventTypes?: string[];
  onError?: (error: unknown, event: Event) => void;
};

export type ApplyDecisionCommitOptions = {
  includeChoice?: boolean;
  choiceKey?: string;
};

export type DecisionCommitAdapter<TPayload extends Record<string, unknown> = Record<string, unknown>> = (
  payload: TPayload,
  receipt: DecisionReceipt,
  options?: ApplyDecisionCommitOptions,
) => TPayload;

export type ApplyDecisionCommitByComponentOptions = ApplyDecisionCommitOptions & {
  allowGenericFallback?: boolean;
  questionFlowTitle?: string;
  questionFlowEmptyValueLabel?: string;
};
