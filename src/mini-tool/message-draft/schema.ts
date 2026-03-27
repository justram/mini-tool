import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const MessageDraftChannelSchema = Type.Union([Type.Literal("email"), Type.Literal("slack")]);
export const MessageDraftOutcomeSchema = Type.Union([Type.Literal("sent"), Type.Literal("cancelled")]);

export const SlackTargetSchema = Type.Union([
  Type.Object({
    type: Type.Literal("channel"),
    name: Type.String({ minLength: 1 }),
    memberCount: Type.Optional(Type.Number()),
  }),
  Type.Object({
    type: Type.Literal("dm"),
    name: Type.String({ minLength: 1 }),
  }),
]);

export const SerializableEmailDraftSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  body: Type.String({ minLength: 1 }),
  outcome: Type.Optional(MessageDraftOutcomeSchema),
  channel: Type.Literal("email"),
  subject: Type.String({ minLength: 1 }),
  from: Type.Optional(Type.String()),
  to: Type.Array(Type.String(), { minItems: 1 }),
  cc: Type.Optional(Type.Array(Type.String())),
  bcc: Type.Optional(Type.Array(Type.String())),
  undoGracePeriod: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
});

export const SerializableSlackDraftSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  body: Type.String({ minLength: 1 }),
  outcome: Type.Optional(MessageDraftOutcomeSchema),
  channel: Type.Literal("slack"),
  target: SlackTargetSchema,
  undoGracePeriod: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
});

export const SerializableMessageDraftSchema = Type.Union([SerializableEmailDraftSchema, SerializableSlackDraftSchema]);

export type MessageDraftChannel = Static<typeof MessageDraftChannelSchema>;
export type MessageDraftOutcome = Static<typeof MessageDraftOutcomeSchema>;
export type SlackTarget = Static<typeof SlackTargetSchema>;
export type SerializableEmailDraft = Static<typeof SerializableEmailDraftSchema>;
export type SerializableSlackDraft = Static<typeof SerializableSlackDraftSchema>;
export type SerializableMessageDraft = Static<typeof SerializableMessageDraftSchema>;

const validateSerializableMessageDraft = ajv.compile<SerializableMessageDraft>(SerializableMessageDraftSchema);

export function parseSerializableMessageDraft(input: unknown): SerializableMessageDraft {
  if (!validateSerializableMessageDraft(input)) {
    throw new Error(ajv.errorsText(validateSerializableMessageDraft.errors));
  }

  return input;
}

export function safeParseSerializableMessageDraft(input: unknown): SerializableMessageDraft | null {
  if (!validateSerializableMessageDraft(input)) {
    return null;
  }

  return input;
}
