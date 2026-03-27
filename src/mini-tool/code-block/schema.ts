import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const CodeBlockLineNumbersSchema = Type.Union([Type.Literal("visible"), Type.Literal("hidden")]);

const SerializableCodeBlockRawSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  code: Type.String(),
  language: Type.Optional(Type.String({ minLength: 1 })),
  lineNumbers: Type.Optional(CodeBlockLineNumbersSchema),
  filename: Type.Optional(Type.String()),
  highlightLines: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }))),
  maxCollapsedLines: Type.Optional(Type.Number({ minimum: 1 })),
});

export const SerializableCodeBlockSchema = SerializableCodeBlockRawSchema;

export type CodeBlockLineNumbersMode = Static<typeof CodeBlockLineNumbersSchema>;
type SerializableCodeBlockRaw = Static<typeof SerializableCodeBlockRawSchema>;

export type SerializableCodeBlock = Omit<SerializableCodeBlockRaw, "language" | "lineNumbers"> & {
  language: string;
  lineNumbers: CodeBlockLineNumbersMode;
};

const validateSerializableCodeBlock = ajv.compile<SerializableCodeBlockRaw>(SerializableCodeBlockRawSchema);

function withDefaults(value: SerializableCodeBlockRaw): SerializableCodeBlock {
  return {
    ...value,
    language: value.language ?? "text",
    lineNumbers: value.lineNumbers ?? "visible",
  };
}

export function parseSerializableCodeBlock(input: unknown): SerializableCodeBlock {
  if (!validateSerializableCodeBlock(input)) {
    throw new Error(ajv.errorsText(validateSerializableCodeBlock.errors));
  }

  return withDefaults(input);
}

export function safeParseSerializableCodeBlock(input: unknown): SerializableCodeBlock | null {
  if (!validateSerializableCodeBlock(input)) {
    return null;
  }

  return withDefaults(input);
}
