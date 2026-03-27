import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SourceSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  iconUrl: Type.Optional(Type.String({ format: "uri" })),
  url: Type.Optional(Type.String({ format: "uri" })),
});

export const SerializableAudioSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  assetId: Type.String({ minLength: 1 }),
  src: Type.String({ format: "uri" }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  artwork: Type.Optional(Type.String({ format: "uri" })),
  durationMs: Type.Optional(Type.Integer({ minimum: 1 })),
  fileSizeBytes: Type.Optional(Type.Integer({ minimum: 1 })),
  createdAt: Type.Optional(Type.String({ format: "date-time" })),
  locale: Type.Optional(Type.String()),
  source: Type.Optional(SourceSchema),
});

export const AudioVariantSchema = Type.Union([Type.Literal("full"), Type.Literal("compact")]);

export type Source = Static<typeof SourceSchema>;
export type SerializableAudio = Static<typeof SerializableAudioSchema>;
export type AudioVariant = Static<typeof AudioVariantSchema>;

const validateSerializableAudio = ajv.compile<SerializableAudio>(SerializableAudioSchema);

export function parseSerializableAudio(input: unknown): SerializableAudio {
  if (!validateSerializableAudio(input)) {
    throw new Error(ajv.errorsText(validateSerializableAudio.errors));
  }

  return input;
}

export function safeParseSerializableAudio(input: unknown): SerializableAudio | null {
  if (!validateSerializableAudio(input)) {
    return null;
  }

  return input;
}
