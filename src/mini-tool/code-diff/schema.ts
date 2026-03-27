import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const CodeDiffLineNumbersSchema = Type.Union([Type.Literal("visible"), Type.Literal("hidden")]);
export const CodeDiffStyleSchema = Type.Union([Type.Literal("unified"), Type.Literal("split")]);

const SerializableCodeDiffRawSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  receipt: Type.Optional(MiniToolReceiptSchema),
  oldCode: Type.Optional(Type.String()),
  newCode: Type.Optional(Type.String()),
  patch: Type.Optional(Type.String()),
  language: Type.Optional(Type.String({ minLength: 1 })),
  filename: Type.Optional(Type.String()),
  lineNumbers: Type.Optional(CodeDiffLineNumbersSchema),
  diffStyle: Type.Optional(CodeDiffStyleSchema),
  maxCollapsedLines: Type.Optional(Type.Number({ minimum: 1 })),
});

export const SerializableCodeDiffSchema = SerializableCodeDiffRawSchema;

export type CodeDiffLineNumbersMode = Static<typeof CodeDiffLineNumbersSchema>;
export type CodeDiffStyle = Static<typeof CodeDiffStyleSchema>;
type SerializableCodeDiffRaw = Static<typeof SerializableCodeDiffRawSchema>;

export type SerializableCodeDiff = Omit<SerializableCodeDiffRaw, "language" | "lineNumbers" | "diffStyle"> & {
  language: string;
  lineNumbers: CodeDiffLineNumbersMode;
  diffStyle: CodeDiffStyle;
};

const validateSerializableCodeDiff = ajv.compile<SerializableCodeDiffRaw>(SerializableCodeDiffRawSchema);

function hasFileMode(value: SerializableCodeDiffRaw): boolean {
  return Boolean(value.oldCode || value.newCode);
}

function withDefaults(value: SerializableCodeDiffRaw): SerializableCodeDiff {
  return {
    ...value,
    language: value.language ?? "text",
    lineNumbers: value.lineNumbers ?? "visible",
    diffStyle: value.diffStyle ?? "unified",
  };
}

function validateInputMode(value: SerializableCodeDiffRaw): void {
  const hasPatch = Boolean(value.patch);
  const hasFiles = hasFileMode(value);

  if (!hasPatch && !hasFiles) {
    throw new Error("Provide either a patch string or at least one of oldCode/newCode");
  }

  if (hasPatch && hasFiles) {
    throw new Error("Cannot mix patch mode with oldCode/newCode — use one or the other");
  }
}

export function parseSerializableCodeDiff(input: unknown): SerializableCodeDiff {
  if (!validateSerializableCodeDiff(input)) {
    throw new Error(ajv.errorsText(validateSerializableCodeDiff.errors));
  }

  validateInputMode(input);
  return withDefaults(input);
}

export function safeParseSerializableCodeDiff(input: unknown): SerializableCodeDiff | null {
  if (!validateSerializableCodeDiff(input)) {
    return null;
  }

  try {
    validateInputMode(input);
    return withDefaults(input);
  } catch {
    return null;
  }
}
