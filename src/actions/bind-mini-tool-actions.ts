import { DEFAULT_ACTION_EVENT_TYPES, resolveActionKind } from "./classification.js";
import { normalizeMiniToolActionEvent } from "./registry/index.js";
import type { BindMiniToolActionsHandlers, BindMiniToolActionsOptions, MiniToolActionEnvelope } from "./types.js";

function reportError(error: unknown, event: Event, onError?: (error: unknown, event: Event) => void): void {
  if (onError) {
    onError(error, event);
    return;
  }

  queueMicrotask(() => {
    throw error;
  });
}

export function bindMiniToolActions(
  target: EventTarget,
  handlers: BindMiniToolActionsHandlers,
  options: BindMiniToolActionsOptions = {},
): () => void {
  const eventTypes = options.eventTypes ?? [...DEFAULT_ACTION_EVENT_TYPES];

  const listener = (event: Event): void => {
    const run = async (): Promise<void> => {
      const normalized = normalizeMiniToolActionEvent(event);
      if (!normalized) {
        return;
      }

      const kind = resolveActionKind(normalized.component, normalized.actionId, options.classificationOverride);

      const action: MiniToolActionEnvelope = {
        component: normalized.component,
        componentId: normalized.componentId,
        actionId: normalized.actionId,
        kind,
        state: normalized.state,
        decision: normalized.decision,
        rawEvent: event,
      };

      if (kind === "local") {
        await handlers.onLocalAction?.(action);
        return;
      }

      if (!handlers.onDecisionAction) {
        throw new Error(
          `Received decision action '${normalized.component}.${normalized.actionId}' without an onDecisionAction handler.`,
        );
      }

      const receipt = await handlers.onDecisionAction(action);
      await handlers.commitDecision?.(receipt);
    };

    void run().catch((error) => {
      reportError(error, event, options.onError);
    });
  };

  for (const eventType of eventTypes) {
    target.addEventListener(eventType, listener);
  }

  return () => {
    for (const eventType of eventTypes) {
      target.removeEventListener(eventType, listener);
    }
  };
}
