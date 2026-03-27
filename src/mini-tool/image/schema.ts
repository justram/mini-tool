import { type Static, Type } from "@sinclair/typebox";
import { AspectRatioSchema, MediaFitSchema } from "../../shared/media.js";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SourceSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  iconUrl: Type.Optional(Type.String({ format: "uri" })),
  url: Type.Optional(Type.String({ format: "uri" })),
});

export const SerializableImageSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  assetId: Type.String({ minLength: 1 }),
  src: Type.String({ format: "uri" }),
  alt: Type.String({ minLength: 1 }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  href: Type.Optional(Type.String({ format: "uri" })),
  domain: Type.Optional(Type.String()),
  ratio: Type.Optional(AspectRatioSchema),
  fit: Type.Optional(MediaFitSchema),
  fileSizeBytes: Type.Optional(Type.Integer({ minimum: 1 })),
  createdAt: Type.Optional(Type.String({ format: "date-time" })),
  locale: Type.Optional(Type.String()),
  source: Type.Optional(SourceSchema),
});

export type Source = Static<typeof SourceSchema>;
export type SerializableImage = Static<typeof SerializableImageSchema>;

const validateSerializableImage = ajv.compile<SerializableImage>(SerializableImageSchema);

export function parseSerializableImage(input: unknown): SerializableImage {
  if (!validateSerializableImage(input)) {
    throw new Error(ajv.errorsText(validateSerializableImage.errors));
  }

  return input;
}

export function safeParseSerializableImage(input: unknown): SerializableImage | null {
  if (!validateSerializableImage(input)) {
    return null;
  }

  return input;
}
