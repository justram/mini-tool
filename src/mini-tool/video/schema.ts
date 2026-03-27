import { type Static, Type } from "@sinclair/typebox";
import { AspectRatioSchema, MediaFitSchema } from "../../shared/media.js";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SourceSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  iconUrl: Type.Optional(Type.String({ format: "uri" })),
  url: Type.Optional(Type.String({ format: "uri" })),
});

export const SerializableVideoSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  assetId: Type.String({ minLength: 1 }),
  src: Type.String({ format: "uri" }),
  poster: Type.Optional(Type.String({ format: "uri" })),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  href: Type.Optional(Type.String({ format: "uri" })),
  domain: Type.Optional(Type.String()),
  durationMs: Type.Optional(Type.Integer({ minimum: 1 })),
  ratio: Type.Optional(AspectRatioSchema),
  fit: Type.Optional(MediaFitSchema),
  createdAt: Type.Optional(Type.String({ format: "date-time" })),
  locale: Type.Optional(Type.String()),
  source: Type.Optional(SourceSchema),
});

export type Source = Static<typeof SourceSchema>;
export type SerializableVideo = Static<typeof SerializableVideoSchema>;

const validateSerializableVideo = ajv.compile<SerializableVideo>(SerializableVideoSchema);

export function parseSerializableVideo(input: unknown): SerializableVideo {
  if (!validateSerializableVideo(input)) {
    throw new Error(ajv.errorsText(validateSerializableVideo.errors));
  }

  return input;
}

export function safeParseSerializableVideo(input: unknown): SerializableVideo | null {
  if (!validateSerializableVideo(input)) {
    return null;
  }

  return input;
}
