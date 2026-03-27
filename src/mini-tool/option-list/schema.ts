import { type Static, Type } from "@sinclair/typebox";
import {
  MiniToolIdSchema,
  MiniToolReceiptSchema,
  MiniToolRoleSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
} from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const OptionListOptionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  disabled: Type.Optional(Type.Boolean()),
});

export const OptionListSelectionSchema = Type.Union([Type.Array(Type.String()), Type.String(), Type.Null()]);

export const SerializableOptionListSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  options: Type.Array(OptionListOptionSchema, { minItems: 1 }),
  selectionMode: Type.Optional(Type.Union([Type.Literal("multi"), Type.Literal("single")])),
  defaultValue: Type.Optional(OptionListSelectionSchema),
  choice: Type.Optional(OptionListSelectionSchema),
  actions: Type.Optional(
    Type.Union([Type.Array(SerializableActionSchema, { minItems: 1 }), SerializableActionsConfigSchema]),
  ),
  minSelections: Type.Optional(Type.Number({ minimum: 0 })),
  maxSelections: Type.Optional(Type.Number({ minimum: 1 })),
});

export type OptionListOption = Static<typeof OptionListOptionSchema>;
export type OptionListSelection = Static<typeof OptionListSelectionSchema>;
export type SerializableOptionList = Static<typeof SerializableOptionListSchema>;

const validateSerializableOptionList = ajv.compile<SerializableOptionList>(SerializableOptionListSchema);

function selectionToIds(selection: OptionListSelection | undefined): string[] {
  if (selection == null) {
    return [];
  }

  if (typeof selection === "string") {
    return [selection];
  }

  return selection;
}

function validateInvariants(input: SerializableOptionList): string[] {
  const issues: string[] = [];

  if (
    input.minSelections !== undefined &&
    input.maxSelections !== undefined &&
    input.minSelections > input.maxSelections
  ) {
    issues.push("`minSelections` cannot be greater than `maxSelections`.");
  }

  const optionIds = new Set<string>();
  input.options.forEach((option, index) => {
    if (optionIds.has(option.id)) {
      issues.push(`Duplicate option id "${option.id}" at options[${index}] is not allowed.`);
      return;
    }

    optionIds.add(option.id);
  });

  const selectionFields: Array<["defaultValue" | "choice", OptionListSelection | undefined]> = [
    ["defaultValue", input.defaultValue],
    ["choice", input.choice],
  ];

  selectionFields.forEach(([name, selection]) => {
    selectionToIds(selection).forEach((selectionId, index) => {
      if (!optionIds.has(selectionId)) {
        const path = typeof selection === "string" ? name : `${name}[${index}]`;
        issues.push(`Selection id "${selectionId}" in ${path} must exist in options.`);
      }
    });
  });

  return issues;
}

export function parseSerializableOptionList(input: unknown): SerializableOptionList {
  if (!validateSerializableOptionList(input)) {
    throw new Error(ajv.errorsText(validateSerializableOptionList.errors));
  }

  const invariantIssues = validateInvariants(input);
  if (invariantIssues.length > 0) {
    throw new Error(invariantIssues.join(" "));
  }

  return input;
}

export function safeParseSerializableOptionList(input: unknown): SerializableOptionList | null {
  if (!validateSerializableOptionList(input)) {
    return null;
  }

  if (validateInvariants(input).length > 0) {
    return null;
  }

  return input;
}
