import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const ProgressStepStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in-progress"),
  Type.Literal("completed"),
  Type.Literal("failed"),
]);

export const ProgressStepSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  status: ProgressStepStatusSchema,
});

export const SerializableProgressTrackerSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  steps: Type.Array(ProgressStepSchema, { minItems: 1 }),
  elapsedTime: Type.Optional(Type.Number({ minimum: 0 })),
  choice: Type.Optional(MiniToolReceiptSchema),
});

export type ProgressStepStatus = Static<typeof ProgressStepStatusSchema>;
export type ProgressStep = Static<typeof ProgressStepSchema>;
export type ProgressTrackerChoice = Static<typeof MiniToolReceiptSchema>;
export type SerializableProgressTracker = Static<typeof SerializableProgressTrackerSchema>;

const validateSerializableProgressTracker = ajv.compile<SerializableProgressTracker>(SerializableProgressTrackerSchema);

function validateInvariants(input: SerializableProgressTracker): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  input.steps.forEach((step, index) => {
    if (seen.has(step.id)) {
      issues.push(`Duplicate step id: "${step.id}" at steps[${index}].`);
      return;
    }

    seen.add(step.id);
  });

  return issues;
}

export function parseSerializableProgressTracker(input: unknown): SerializableProgressTracker {
  if (!validateSerializableProgressTracker(input)) {
    throw new Error(ajv.errorsText(validateSerializableProgressTracker.errors));
  }

  const invariantIssues = validateInvariants(input);
  if (invariantIssues.length > 0) {
    throw new Error(invariantIssues.join(" "));
  }

  return input;
}

export function safeParseSerializableProgressTracker(input: unknown): SerializableProgressTracker | null {
  if (!validateSerializableProgressTracker(input)) {
    return null;
  }

  if (validateInvariants(input).length > 0) {
    return null;
  }

  return input;
}
