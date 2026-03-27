import type { MiniToolUiExampleElementId } from "../harness-config.js";
import { PRESET_ENTRIES } from "./registry.js";
import type {
  MiniToolUiExampleClonePayload,
  MiniToolUiExamplePayloadTarget,
  MiniToolUiExampleResetPayloads,
} from "./types.js";

function isResetPayloadPatch(value: unknown): value is Partial<MiniToolUiExampleResetPayloads> {
  return typeof value === "object" && value !== null;
}

function assertResetPayloadsComplete(
  payloads: Partial<MiniToolUiExampleResetPayloads>,
): asserts payloads is MiniToolUiExampleResetPayloads {
  const requiredKeys: (keyof MiniToolUiExampleResetPayloads)[] = [
    "initialOptionListPayload",
    "initialApprovalCardPayload",
    "initialInstagramPostPayload",
    "initialMessageDraftPayload",
    "initialPreferencesPanelPayload",
    "initialQuestionFlowPayload",
  ];

  const missing = requiredKeys.filter((key) => payloads[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Missing initial reset payloads: ${missing.join(", ")}`);
  }
}

export function applyInitialPayloads(
  resolveElement: (elementId: MiniToolUiExampleElementId) => MiniToolUiExamplePayloadTarget,
  clonePayload: MiniToolUiExampleClonePayload,
): MiniToolUiExampleResetPayloads {
  const resetPayloads: Partial<MiniToolUiExampleResetPayloads> = {};

  for (const entry of PRESET_ENTRIES) {
    const element = resolveElement(entry.elementId);
    const result = entry.apply(element, clonePayload);
    if (isResetPayloadPatch(result)) {
      Object.assign(resetPayloads, result);
    }
  }

  assertResetPayloadsComplete(resetPayloads);
  return resetPayloads;
}
