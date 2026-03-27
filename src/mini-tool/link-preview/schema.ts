import { type Static, Type } from "@sinclair/typebox";
import { AspectRatioSchema, MediaFitSchema } from "../../shared/media.js";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SerializableLinkPreviewSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  href: Type.String({ format: "uri" }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  image: Type.Optional(Type.String({ format: "uri" })),
  domain: Type.Optional(Type.String()),
  favicon: Type.Optional(Type.String({ format: "uri" })),
  ratio: Type.Optional(AspectRatioSchema),
  fit: Type.Optional(MediaFitSchema),
  createdAt: Type.Optional(Type.String({ format: "date-time" })),
  locale: Type.Optional(Type.String()),
});

export type SerializableLinkPreview = Static<typeof SerializableLinkPreviewSchema>;

const validateSerializableLinkPreview = ajv.compile<SerializableLinkPreview>(SerializableLinkPreviewSchema);

export function parseSerializableLinkPreview(input: unknown): SerializableLinkPreview {
  if (!validateSerializableLinkPreview(input)) {
    throw new Error(ajv.errorsText(validateSerializableLinkPreview.errors));
  }

  return input;
}

export function safeParseSerializableLinkPreview(input: unknown): SerializableLinkPreview | null {
  if (!validateSerializableLinkPreview(input)) {
    return null;
  }

  return input;
}
