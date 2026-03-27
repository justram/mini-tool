import { type Static, Type } from "@sinclair/typebox";

export const AspectRatioSchema = Type.Union([
  Type.Literal("auto"),
  Type.Literal("1:1"),
  Type.Literal("4:3"),
  Type.Literal("16:9"),
  Type.Literal("9:16"),
]);

export const MediaFitSchema = Type.Union([Type.Literal("cover"), Type.Literal("contain")]);

export type AspectRatio = Static<typeof AspectRatioSchema>;
export type MediaFit = Static<typeof MediaFitSchema>;

export function sanitizeHref(href?: string): string | undefined {
  if (!href) {
    return undefined;
  }

  const candidate = href.trim();
  if (!candidate) {
    return undefined;
  }

  if (
    candidate.startsWith("/") ||
    candidate.startsWith("./") ||
    candidate.startsWith("../") ||
    candidate.startsWith("?") ||
    candidate.startsWith("#")
  ) {
    if (candidate.startsWith("//")) {
      return undefined;
    }
    if (/[\u0000-\u001F\u007F]/.test(candidate)) {
      return undefined;
    }
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}
