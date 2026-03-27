import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const ImageGallerySourceSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  url: Type.Optional(Type.String({ format: "uri" })),
});

export const ImageGalleryItemSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  src: Type.String({ format: "uri" }),
  alt: Type.String({ minLength: 1 }),
  width: Type.Number({ exclusiveMinimum: 0 }),
  height: Type.Number({ exclusiveMinimum: 0 }),
  title: Type.Optional(Type.String()),
  caption: Type.Optional(Type.String()),
  source: Type.Optional(ImageGallerySourceSchema),
});

export const SerializableImageGallerySchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  images: Type.Array(ImageGalleryItemSchema, { minItems: 1 }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
});

export type ImageGallerySource = Static<typeof ImageGallerySourceSchema>;
export type ImageGalleryItem = Static<typeof ImageGalleryItemSchema>;
export type SerializableImageGallery = Static<typeof SerializableImageGallerySchema>;

const validateSerializableImageGallery = ajv.compile<SerializableImageGallery>(SerializableImageGallerySchema);

export function parseSerializableImageGallery(input: unknown): SerializableImageGallery {
  if (!validateSerializableImageGallery(input)) {
    throw new Error(ajv.errorsText(validateSerializableImageGallery.errors));
  }

  return input;
}

export function safeParseSerializableImageGallery(input: unknown): SerializableImageGallery | null {
  if (!validateSerializableImageGallery(input)) {
    return null;
  }

  return input;
}
