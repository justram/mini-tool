import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SerializableTerminalSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  command: Type.String(),
  stdout: Type.Optional(Type.String()),
  stderr: Type.Optional(Type.String()),
  exitCode: Type.Integer({ minimum: 0 }),
  durationMs: Type.Optional(Type.Number()),
  cwd: Type.Optional(Type.String()),
  truncated: Type.Optional(Type.Boolean()),
  maxCollapsedLines: Type.Optional(Type.Number({ minimum: 1 })),
});

export type SerializableTerminal = Static<typeof SerializableTerminalSchema>;

const validateSerializableTerminal = ajv.compile<SerializableTerminal>(SerializableTerminalSchema);

export function parseSerializableTerminal(input: unknown): SerializableTerminal {
  if (!validateSerializableTerminal(input)) {
    throw new Error(ajv.errorsText(validateSerializableTerminal.errors));
  }

  return input;
}

export function safeParseSerializableTerminal(input: unknown): SerializableTerminal | null {
  if (!validateSerializableTerminal(input)) {
    return null;
  }

  return input;
}
