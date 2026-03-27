import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const PlanTodoStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in_progress"),
  Type.Literal("completed"),
  Type.Literal("cancelled"),
]);

export const PlanTodoSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  status: PlanTodoStatusSchema,
  description: Type.Optional(Type.String()),
});

export const SerializablePlanSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  todos: Type.Array(PlanTodoSchema, { minItems: 1 }),
  maxVisibleTodos: Type.Optional(Type.Integer({ minimum: 1 })),
});

export type PlanTodoStatus = Static<typeof PlanTodoStatusSchema>;
export type PlanTodo = Static<typeof PlanTodoSchema>;
export type SerializablePlan = Static<typeof SerializablePlanSchema>;

const validateSerializablePlan = ajv.compile<SerializablePlan>(SerializablePlanSchema);

function validateInvariants(input: SerializablePlan): string[] {
  const issues: string[] = [];
  const seenTodoIds = new Set<string>();

  input.todos.forEach((todo, index) => {
    if (seenTodoIds.has(todo.id)) {
      issues.push(`Duplicate todo id: "${todo.id}" at todos[${index}].`);
      return;
    }

    seenTodoIds.add(todo.id);
  });

  return issues;
}

export function parseSerializablePlan(input: unknown): SerializablePlan {
  if (!validateSerializablePlan(input)) {
    throw new Error(ajv.errorsText(validateSerializablePlan.errors));
  }

  const invariantIssues = validateInvariants(input);
  if (invariantIssues.length > 0) {
    throw new Error(invariantIssues.join(" "));
  }

  return input;
}

export function safeParseSerializablePlan(input: unknown): SerializablePlan | null {
  if (!validateSerializablePlan(input)) {
    return null;
  }

  if (validateInvariants(input).length > 0) {
    return null;
  }

  return input;
}
