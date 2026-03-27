import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

const TextFormatSchema = Type.Object(
  {
    kind: Type.Literal("text"),
  },
  { additionalProperties: false },
);

const NumberFormatSchema = Type.Object(
  {
    kind: Type.Literal("number"),
    decimals: Type.Optional(Type.Integer({ minimum: 0 })),
    compact: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const CurrencyFormatSchema = Type.Object(
  {
    kind: Type.Literal("currency"),
    currency: Type.String({ minLength: 1 }),
    decimals: Type.Optional(Type.Integer({ minimum: 0 })),
  },
  { additionalProperties: false },
);

const PercentFormatSchema = Type.Object(
  {
    kind: Type.Literal("percent"),
    decimals: Type.Optional(Type.Integer({ minimum: 0 })),
    basis: Type.Optional(Type.Union([Type.Literal("fraction"), Type.Literal("unit")])),
  },
  { additionalProperties: false },
);

export const StatFormatSchema = Type.Union([
  TextFormatSchema,
  NumberFormatSchema,
  CurrencyFormatSchema,
  PercentFormatSchema,
]);

export const StatDiffSchema = Type.Object(
  {
    value: Type.Number(),
    decimals: Type.Optional(Type.Integer({ minimum: 0 })),
    upIsPositive: Type.Optional(Type.Boolean()),
    label: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const StatSparklineSchema = Type.Object(
  {
    data: Type.Array(Type.Number(), { minItems: 2 }),
    color: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const StatItemSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    label: Type.String({ minLength: 1 }),
    value: Type.Union([Type.String(), Type.Number()]),
    format: Type.Optional(StatFormatSchema),
    diff: Type.Optional(StatDiffSchema),
    sparkline: Type.Optional(StatSparklineSchema),
  },
  { additionalProperties: false },
);

export const SerializableStatsDisplaySchema = Type.Object(
  {
    id: MiniToolIdSchema,
    role: Type.Optional(MiniToolRoleSchema),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    stats: Type.Array(StatItemSchema, { minItems: 1 }),
  },
  { additionalProperties: false },
);

export type StatFormat = Static<typeof StatFormatSchema>;
export type StatDiff = Static<typeof StatDiffSchema>;
export type StatSparkline = Static<typeof StatSparklineSchema>;
export type StatItem = Static<typeof StatItemSchema>;
export type SerializableStatsDisplay = Static<typeof SerializableStatsDisplaySchema>;

const validateSerializableStatsDisplay = ajv.compile<SerializableStatsDisplay>(SerializableStatsDisplaySchema);

export function parseSerializableStatsDisplay(input: unknown): SerializableStatsDisplay {
  if (!validateSerializableStatsDisplay(input)) {
    throw new Error(ajv.errorsText(validateSerializableStatsDisplay.errors));
  }

  return input;
}

export function safeParseSerializableStatsDisplay(input: unknown): SerializableStatsDisplay | null {
  if (!validateSerializableStatsDisplay(input)) {
    return null;
  }

  return input;
}
