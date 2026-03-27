import { type Static, Type } from "@sinclair/typebox";
import {
  MiniToolIdSchema,
  MiniToolReceiptSchema,
  MiniToolRoleSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
} from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

const PreferenceOptionSchema = Type.Object({
  value: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
});

const PreferenceItemBaseSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
});

export const PreferenceSwitchSchema = Type.Composite([
  PreferenceItemBaseSchema,
  Type.Object({
    type: Type.Literal("switch"),
    defaultChecked: Type.Optional(Type.Boolean()),
  }),
]);

export const PreferenceToggleSchema = Type.Composite([
  PreferenceItemBaseSchema,
  Type.Object({
    type: Type.Literal("toggle"),
    options: Type.Array(PreferenceOptionSchema, { minItems: 2 }),
    defaultValue: Type.Optional(Type.String()),
  }),
]);

export const PreferenceSelectSchema = Type.Composite([
  PreferenceItemBaseSchema,
  Type.Object({
    type: Type.Literal("select"),
    selectOptions: Type.Array(PreferenceOptionSchema, { minItems: 5 }),
    defaultSelected: Type.Optional(Type.String()),
  }),
]);

export const PreferenceItemSchema = Type.Union([
  PreferenceSwitchSchema,
  PreferenceToggleSchema,
  PreferenceSelectSchema,
]);

export const PreferenceSectionSchema = Type.Object({
  heading: Type.Optional(Type.String({ minLength: 1 })),
  items: Type.Array(PreferenceItemSchema, { minItems: 1 }),
});

const PreferencesPanelBaseSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  title: Type.Optional(Type.String({ minLength: 1 })),
  sections: Type.Array(PreferenceSectionSchema, { minItems: 1 }),
});

export const SerializablePreferencesPanelSchema = Type.Composite([
  PreferencesPanelBaseSchema,
  Type.Object({
    actions: Type.Optional(Type.Union([Type.Array(SerializableActionSchema), SerializableActionsConfigSchema])),
  }),
]);

export const PreferencesValueSchema = Type.Record(Type.String(), Type.Union([Type.String(), Type.Boolean()]));

export const SerializablePreferencesPanelReceiptSchema = Type.Composite([
  PreferencesPanelBaseSchema,
  Type.Object({
    choice: PreferencesValueSchema,
    error: Type.Optional(Type.Record(Type.String(), Type.String())),
  }),
]);

export type PreferenceSwitch = Static<typeof PreferenceSwitchSchema>;
export type PreferenceToggle = Static<typeof PreferenceToggleSchema>;
export type PreferenceSelect = Static<typeof PreferenceSelectSchema>;
export type PreferenceItem = Static<typeof PreferenceItemSchema>;
export type PreferenceSection = Static<typeof PreferenceSectionSchema>;
export type PreferencesValue = Static<typeof PreferencesValueSchema>;
export type SerializablePreferencesPanel = Static<typeof SerializablePreferencesPanelSchema>;
export type SerializablePreferencesPanelReceipt = Static<typeof SerializablePreferencesPanelReceiptSchema>;

const validateSerializablePreferencesPanel = ajv.compile<SerializablePreferencesPanel>(
  SerializablePreferencesPanelSchema,
);
const validateSerializablePreferencesPanelReceipt = ajv.compile<SerializablePreferencesPanelReceipt>(
  SerializablePreferencesPanelReceiptSchema,
);

export function parseSerializablePreferencesPanel(input: unknown): SerializablePreferencesPanel {
  if (!validateSerializablePreferencesPanel(input)) {
    throw new Error(ajv.errorsText(validateSerializablePreferencesPanel.errors));
  }

  return input;
}

export function safeParseSerializablePreferencesPanel(input: unknown): SerializablePreferencesPanel | null {
  if (!validateSerializablePreferencesPanel(input)) {
    return null;
  }

  return input;
}

export function parseSerializablePreferencesPanelReceipt(input: unknown): SerializablePreferencesPanelReceipt {
  if (!validateSerializablePreferencesPanelReceipt(input)) {
    throw new Error(ajv.errorsText(validateSerializablePreferencesPanelReceipt.errors));
  }

  return input;
}

export function safeParseSerializablePreferencesPanelReceipt(
  input: unknown,
): SerializablePreferencesPanelReceipt | null {
  if (!validateSerializablePreferencesPanelReceipt(input)) {
    return null;
  }

  return input;
}
