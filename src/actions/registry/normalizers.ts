import { asString, resolveComponentId } from "./helpers.js";

export type NormalizedActionInput = {
  component: string;
  componentId: string;
  actionId: string;
  state: unknown;
  decision?: unknown;
};

export type ActionNormalizer = (detail: Record<string, unknown>, event: Event) => NormalizedActionInput | null;

export const normalizeApprovalCard: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "approval-card",
    componentId,
    actionId,
    decision: detail.decision,
    state: {
      decision: detail.decision,
      payload: detail.payload,
    },
  };
};

export const normalizeOptionList: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "option-list",
    componentId,
    actionId,
    decision: detail.value,
    state: {
      value: detail.value,
      payload: detail.payload,
    },
  };
};

export const normalizeParameterSlider: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "parameter-slider",
    componentId,
    actionId,
    decision: detail.values,
    state: {
      values: detail.values,
      payload: detail.payload,
    },
  };
};

export const normalizePreferencesPanel: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "preferences-panel",
    componentId,
    actionId,
    decision: detail.value,
    state: {
      value: detail.value,
      payload: detail.payload,
    },
  };
};

export const normalizeChartDataPointClick: ActionNormalizer = (detail, event) => {
  const componentId = resolveComponentId(event, detail);
  if (!componentId) {
    return null;
  }

  return {
    component: "chart",
    componentId,
    actionId: "point-click",
    decision: detail,
    state: detail,
  };
};

export const normalizeInstagramPostAction: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.action);
  const componentId = asString(detail.postId) ?? resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "instagram-post",
    componentId,
    actionId,
    decision: detail,
    state: detail,
  };
};

export const normalizeItemCarouselAction: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "item-carousel",
    componentId,
    actionId,
    decision: detail.itemId,
    state: detail,
  };
};

export const normalizeItemCarouselItemClick: ActionNormalizer = (detail, event) => {
  const componentId = resolveComponentId(event, detail);
  const itemId = asString(detail.itemId);
  if (!componentId || !itemId) {
    return null;
  }

  return {
    component: "item-carousel",
    componentId,
    actionId: "item-click",
    decision: itemId,
    state: detail,
  };
};

export const normalizeMessageDraftAction: ActionNormalizer = (detail, event) => {
  const actionId = asString(detail.actionId);
  const componentId = resolveComponentId(event, detail);
  if (!actionId || !componentId) {
    return null;
  }

  return {
    component: "message-draft",
    componentId,
    actionId,
    decision: detail.state,
    state: detail,
  };
};

export const normalizeQuestionFlowComplete: ActionNormalizer = (detail, event) => {
  const componentId = resolveComponentId(event, detail);
  if (!componentId) {
    return null;
  }

  return {
    component: "question-flow",
    componentId,
    actionId: "complete",
    decision: detail.answers,
    state: detail,
  };
};
