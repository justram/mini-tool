import { DEFAULT_ACTION_EVENT_TYPES, resolveDefaultActionKind } from "./registry/index.js";
import type { MiniToolActionKind } from "./types.js";

export { DEFAULT_ACTION_EVENT_TYPES };

export function createActionKey(component: string, actionId: string): string {
  return `${component}.${actionId}`;
}

export function resolveActionKind(
  component: string,
  actionId: string,
  override?: Record<string, MiniToolActionKind>,
): MiniToolActionKind {
  const key = createActionKey(component, actionId);
  const overrideKind = override?.[key];
  if (overrideKind) {
    return overrideKind;
  }

  return resolveDefaultActionKind(component, actionId);
}
