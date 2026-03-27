import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const QuestionFlowSelectionModeSchema = Type.Union([Type.Literal("single"), Type.Literal("multi")]);

export const QuestionFlowOptionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  disabled: Type.Optional(Type.Boolean()),
});

export const QuestionFlowStepDefinitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  options: Type.Array(QuestionFlowOptionSchema, { minItems: 1 }),
  selectionMode: Type.Optional(QuestionFlowSelectionModeSchema),
});

export const QuestionFlowSummaryItemSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  value: Type.String({ minLength: 1 }),
});

export const QuestionFlowChoiceSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  summary: Type.Array(QuestionFlowSummaryItemSchema, { minItems: 1 }),
});

const BaseQuestionFlowSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
});

export const SerializableProgressiveModeSchema = Type.Composite([
  BaseQuestionFlowSchema,
  Type.Object({
    step: Type.Integer({ minimum: 1 }),
    title: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    options: Type.Array(QuestionFlowOptionSchema, { minItems: 1 }),
    selectionMode: Type.Optional(QuestionFlowSelectionModeSchema),
  }),
]);

export const SerializableUpfrontModeSchema = Type.Composite([
  BaseQuestionFlowSchema,
  Type.Object({
    steps: Type.Array(QuestionFlowStepDefinitionSchema, { minItems: 1 }),
  }),
]);

export const SerializableReceiptModeSchema = Type.Composite([
  BaseQuestionFlowSchema,
  Type.Object({
    choice: QuestionFlowChoiceSchema,
  }),
]);

export const SerializableQuestionFlowSchema = Type.Union([
  SerializableProgressiveModeSchema,
  SerializableUpfrontModeSchema,
  SerializableReceiptModeSchema,
]);

export type QuestionFlowSelectionMode = Static<typeof QuestionFlowSelectionModeSchema>;
export type QuestionFlowOption = Static<typeof QuestionFlowOptionSchema>;
export type QuestionFlowStepDefinition = Static<typeof QuestionFlowStepDefinitionSchema>;
export type QuestionFlowSummaryItem = Static<typeof QuestionFlowSummaryItemSchema>;
export type QuestionFlowChoice = Static<typeof QuestionFlowChoiceSchema>;
export type SerializableProgressiveMode = Static<typeof SerializableProgressiveModeSchema>;
export type SerializableUpfrontMode = Static<typeof SerializableUpfrontModeSchema>;
export type SerializableReceiptMode = Static<typeof SerializableReceiptModeSchema>;
export type SerializableQuestionFlow = Static<typeof SerializableQuestionFlowSchema>;

const validateSerializableQuestionFlow = ajv.compile<SerializableQuestionFlow>(SerializableQuestionFlowSchema);

function collectDuplicateIds(ids: string[], label: string): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  ids.forEach((id, index) => {
    if (seen.has(id)) {
      issues.push(`Duplicate ${label} id "${id}" at index ${index}.`);
      return;
    }

    seen.add(id);
  });

  return issues;
}

function validateModeInvariants(input: SerializableQuestionFlow): string[] {
  const issues: string[] = [];

  if ("steps" in input) {
    issues.push(
      ...collectDuplicateIds(
        input.steps.map((step) => step.id),
        "step",
      ),
    );
    input.steps.forEach((step, stepIndex) => {
      issues.push(
        ...collectDuplicateIds(
          step.options.map((option) => option.id),
          `option for steps[${stepIndex}]`,
        ),
      );
    });
    return issues;
  }

  if ("options" in input) {
    issues.push(
      ...collectDuplicateIds(
        input.options.map((option) => option.id),
        "option",
      ),
    );
    return issues;
  }

  return issues;
}

export function parseSerializableQuestionFlow(input: unknown): SerializableQuestionFlow {
  if (!validateSerializableQuestionFlow(input)) {
    throw new Error(ajv.errorsText(validateSerializableQuestionFlow.errors));
  }

  const invariantIssues = validateModeInvariants(input);
  if (invariantIssues.length > 0) {
    throw new Error(invariantIssues.join(" "));
  }

  return input;
}

export function safeParseSerializableQuestionFlow(input: unknown): SerializableQuestionFlow | null {
  if (!validateSerializableQuestionFlow(input)) {
    return null;
  }

  if (validateModeInvariants(input).length > 0) {
    return null;
  }

  return input;
}
