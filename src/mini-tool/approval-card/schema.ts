import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const MetadataItemSchema = Type.Object({
  key: Type.String({ minLength: 1 }),
  value: Type.String(),
});

export const ApprovalDecisionSchema = Type.Union([Type.Literal("approved"), Type.Literal("denied")]);

export const ApprovalCardVariantSchema = Type.Union([Type.Literal("default"), Type.Literal("destructive")]);

export const SerializableApprovalCardSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  icon: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Array(MetadataItemSchema)),
  variant: Type.Optional(ApprovalCardVariantSchema),
  confirmLabel: Type.Optional(Type.String()),
  cancelLabel: Type.Optional(Type.String()),
  choice: Type.Optional(ApprovalDecisionSchema),
});

export type MetadataItem = Static<typeof MetadataItemSchema>;
export type ApprovalDecision = Static<typeof ApprovalDecisionSchema>;
export type ApprovalCardVariant = Static<typeof ApprovalCardVariantSchema>;
export type SerializableApprovalCard = Static<typeof SerializableApprovalCardSchema>;

const validateSerializableApprovalCard = ajv.compile<SerializableApprovalCard>(SerializableApprovalCardSchema);

export function parseSerializableApprovalCard(input: unknown): SerializableApprovalCard {
  if (!validateSerializableApprovalCard(input)) {
    throw new Error(ajv.errorsText(validateSerializableApprovalCard.errors));
  }

  return input;
}

export function safeParseSerializableApprovalCard(input: unknown): SerializableApprovalCard | null {
  if (!validateSerializableApprovalCard(input)) {
    return null;
  }

  return input;
}
