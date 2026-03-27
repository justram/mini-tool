import { type Static, Type } from "@sinclair/typebox";

export const MiniToolIdSchema = Type.String({ minLength: 1 });

export const MiniToolRoleSchema = Type.Union([
  Type.Literal("information"),
  Type.Literal("decision"),
  Type.Literal("control"),
  Type.Literal("state"),
  Type.Literal("composite"),
]);

export const MiniToolReceiptOutcomeSchema = Type.Union([
  Type.Literal("success"),
  Type.Literal("partial"),
  Type.Literal("failed"),
  Type.Literal("cancelled"),
]);

export const MiniToolReceiptSchema = Type.Object({
  outcome: MiniToolReceiptOutcomeSchema,
  summary: Type.String({ minLength: 1 }),
  identifiers: Type.Optional(Type.Record(Type.String(), Type.String())),
  at: Type.String({ format: "date-time" }),
});

export const SerializableActionVariantSchema = Type.Union([
  Type.Literal("default"),
  Type.Literal("destructive"),
  Type.Literal("secondary"),
  Type.Literal("ghost"),
  Type.Literal("outline"),
]);

export const SerializableActionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  sentence: Type.Optional(Type.String()),
  confirmLabel: Type.Optional(Type.String()),
  variant: Type.Optional(SerializableActionVariantSchema),
  loading: Type.Optional(Type.Boolean()),
  disabled: Type.Optional(Type.Boolean()),
  shortcut: Type.Optional(Type.String()),
});

export const SerializableActionsAlignSchema = Type.Union([
  Type.Literal("left"),
  Type.Literal("center"),
  Type.Literal("right"),
]);

export const SerializableActionsConfigSchema = Type.Object({
  items: Type.Array(SerializableActionSchema, { minItems: 1 }),
  align: Type.Optional(SerializableActionsAlignSchema),
  confirmTimeout: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
});

export type MiniToolId = Static<typeof MiniToolIdSchema>;
export type MiniToolRole = Static<typeof MiniToolRoleSchema>;
export type MiniToolReceiptOutcome = Static<typeof MiniToolReceiptOutcomeSchema>;
export type MiniToolReceipt = Static<typeof MiniToolReceiptSchema>;
export type SerializableActionVariant = Static<typeof SerializableActionVariantSchema>;
export type SerializableAction = Static<typeof SerializableActionSchema>;
export type SerializableActionsAlign = Static<typeof SerializableActionsAlignSchema>;
export type SerializableActionsConfig = Static<typeof SerializableActionsConfigSchema>;
