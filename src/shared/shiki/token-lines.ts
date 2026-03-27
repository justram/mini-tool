export type ShikiTokenLike = {
  content: string;
  color?: string;
  fontStyle?: number;
};

export type ShikiTokenLineLike = ShikiTokenLike[];

function isTokenLike(value: unknown): value is ShikiTokenLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.content === "string";
}

function isTokenLineLike(value: unknown): value is ShikiTokenLineLike {
  return Array.isArray(value) && value.every((item) => isTokenLike(item));
}

function isTokenLineCollection(value: unknown): value is ShikiTokenLineLike[] {
  return Array.isArray(value) && value.every((line) => isTokenLineLike(line));
}

export function normalizeCodeToTokensResult(result: unknown): ShikiTokenLineLike[] {
  if (isTokenLineCollection(result)) {
    return result;
  }

  if (typeof result !== "object" || result === null) {
    return [];
  }

  const candidate = result as { tokens?: unknown };
  if (isTokenLineCollection(candidate.tokens)) {
    return candidate.tokens;
  }

  return [];
}
