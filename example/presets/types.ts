export type MiniToolUiExamplePayloadTarget = {
  payload: unknown;
  [key: string]: unknown;
};

export type MiniToolUiExampleClonePayload = <T>(value: T) => T;

export type MiniToolUiExampleResetPayloads = {
  initialOptionListPayload: Record<string, unknown>;
  initialApprovalCardPayload: Record<string, unknown>;
  initialInstagramPostPayload: Record<string, unknown>;
  initialMessageDraftPayload: Record<string, unknown>;
  initialPreferencesPanelPayload: Record<string, unknown>;
  initialQuestionFlowPayload: Record<string, unknown>;
};
