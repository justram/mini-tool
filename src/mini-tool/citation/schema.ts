import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const CitationTypeSchema = Type.Union([
  Type.Literal("webpage"),
  Type.Literal("document"),
  Type.Literal("article"),
  Type.Literal("api"),
  Type.Literal("code"),
  Type.Literal("other"),
]);

export const CitationVariantSchema = Type.Union([
  Type.Literal("default"),
  Type.Literal("inline"),
  Type.Literal("stacked"),
]);

export const SerializableCitationSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  href: Type.String({ format: "uri" }),
  title: Type.String({ minLength: 1 }),
  snippet: Type.Optional(Type.String()),
  domain: Type.Optional(Type.String()),
  favicon: Type.Optional(Type.String({ format: "uri" })),
  author: Type.Optional(Type.String()),
  publishedAt: Type.Optional(Type.String({ format: "date-time" })),
  type: Type.Optional(CitationTypeSchema),
  locale: Type.Optional(Type.String()),
});

export type CitationType = Static<typeof CitationTypeSchema>;
export type CitationVariant = Static<typeof CitationVariantSchema>;
export type SerializableCitation = Static<typeof SerializableCitationSchema>;

const validateSerializableCitation = ajv.compile<SerializableCitation>(SerializableCitationSchema);

export function parseSerializableCitation(input: unknown): SerializableCitation {
  if (!validateSerializableCitation(input)) {
    throw new Error(ajv.errorsText(validateSerializableCitation.errors));
  }

  return input;
}

export function safeParseSerializableCitation(input: unknown): SerializableCitation | null {
  if (!validateSerializableCitation(input)) {
    return null;
  }

  return input;
}
