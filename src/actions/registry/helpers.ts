export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asElementWithDataset(value: unknown): { dataset?: Record<string, string | undefined>; id?: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as { dataset?: Record<string, string | undefined>; id?: string };
}

export function resolveComponentId(event: Event, detail: Record<string, unknown>): string | null {
  const explicitId = asString(detail.componentId);
  if (explicitId) {
    return explicitId;
  }

  const payload = asRecord(detail.payload);
  const payloadId = payload ? asString(payload.id) : null;
  if (payloadId) {
    return payloadId;
  }

  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const entry of path) {
    const element = asElementWithDataset(entry);
    if (!element) {
      continue;
    }

    const datasetId = element.dataset?.miniToolId;
    if (datasetId) {
      return datasetId;
    }

    if (typeof element.id === "string" && element.id.length > 0) {
      return element.id;
    }
  }

  return null;
}
