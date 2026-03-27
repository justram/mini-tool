import type { MiniToolActionKind } from "../types.js";
import { asRecord } from "./helpers.js";
import {
  type ActionNormalizer,
  type NormalizedActionInput,
  normalizeApprovalCard,
  normalizeChartDataPointClick,
  normalizeInstagramPostAction,
  normalizeItemCarouselAction,
  normalizeItemCarouselItemClick,
  normalizeMessageDraftAction,
  normalizeOptionList,
  normalizeParameterSlider,
  normalizePreferencesPanel,
  normalizeQuestionFlowComplete,
} from "./normalizers.js";

type DecisionPolicy =
  | {
      kind: "none";
    }
  | {
      kind: "all";
    }
  | {
      kind: "action-ids";
      actionIds: readonly string[];
    };

type ActionEventRegistryEntry = {
  eventType: string;
  component: string;
  decisionPolicy: DecisionPolicy;
  normalize: ActionNormalizer;
};

const ACTION_EVENT_REGISTRY: ActionEventRegistryEntry[] = [
  {
    eventType: "mini-tool:approval-card-action",
    component: "approval-card",
    decisionPolicy: { kind: "action-ids", actionIds: ["confirm", "cancel"] },
    normalize: normalizeApprovalCard,
  },
  {
    eventType: "mini-tool:option-list-action",
    component: "option-list",
    decisionPolicy: { kind: "action-ids", actionIds: ["confirm"] },
    normalize: normalizeOptionList,
  },
  {
    eventType: "mini-tool:parameter-slider-action",
    component: "parameter-slider",
    decisionPolicy: { kind: "action-ids", actionIds: ["apply"] },
    normalize: normalizeParameterSlider,
  },
  {
    eventType: "mini-tool:preferences-panel-action",
    component: "preferences-panel",
    decisionPolicy: { kind: "action-ids", actionIds: ["save"] },
    normalize: normalizePreferencesPanel,
  },
  {
    eventType: "mini-tool:chart-data-point-click",
    component: "chart",
    decisionPolicy: { kind: "none" },
    normalize: normalizeChartDataPointClick,
  },
  {
    eventType: "mini-tool:instagram-post-action",
    component: "instagram-post",
    decisionPolicy: { kind: "none" },
    normalize: normalizeInstagramPostAction,
  },
  {
    eventType: "mini-tool:item-carousel-action",
    component: "item-carousel",
    decisionPolicy: { kind: "none" },
    normalize: normalizeItemCarouselAction,
  },
  {
    eventType: "mini-tool:item-carousel-item-click",
    component: "item-carousel",
    decisionPolicy: { kind: "none" },
    normalize: normalizeItemCarouselItemClick,
  },
  {
    eventType: "mini-tool:message-draft-action",
    component: "message-draft",
    decisionPolicy: { kind: "action-ids", actionIds: ["send"] },
    normalize: normalizeMessageDraftAction,
  },
  {
    eventType: "mini-tool:question-flow-complete",
    component: "question-flow",
    decisionPolicy: { kind: "all" },
    normalize: normalizeQuestionFlowComplete,
  },
];

const NORMALIZER_BY_EVENT = new Map<string, ActionNormalizer>(
  ACTION_EVENT_REGISTRY.map((entry) => [entry.eventType, entry.normalize]),
);

const DECISION_KIND_BY_ACTION_KEY = new Map<string, MiniToolActionKind>();
for (const entry of ACTION_EVENT_REGISTRY) {
  if (entry.decisionPolicy.kind === "none") {
    continue;
  }

  if (entry.decisionPolicy.kind === "all") {
    DECISION_KIND_BY_ACTION_KEY.set(`${entry.component}.*`, "decision");
    continue;
  }

  for (const actionId of entry.decisionPolicy.actionIds) {
    DECISION_KIND_BY_ACTION_KEY.set(`${entry.component}.${actionId}`, "decision");
  }
}

export const DEFAULT_ACTION_EVENT_TYPES = ACTION_EVENT_REGISTRY.map((entry) => entry.eventType);

export function normalizeMiniToolActionEvent(event: Event): NormalizedActionInput | null {
  const customEvent = event as CustomEvent<unknown>;
  const detail = asRecord(customEvent.detail);
  if (!detail) {
    return null;
  }

  const normalizer = NORMALIZER_BY_EVENT.get(event.type);
  if (!normalizer) {
    return null;
  }

  return normalizer(detail, event);
}

export function resolveDefaultActionKind(component: string, actionId: string): MiniToolActionKind {
  const specific = DECISION_KIND_BY_ACTION_KEY.get(`${component}.${actionId}`);
  if (specific) {
    return specific;
  }

  const wildcard = DECISION_KIND_BY_ACTION_KEY.get(`${component}.*`);
  if (wildcard) {
    return wildcard;
  }

  return "local";
}
