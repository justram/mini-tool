import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

const AlignSchema = Type.Union([Type.Literal("left"), Type.Literal("right"), Type.Literal("center")]);
const PrioritySchema = Type.Union([Type.Literal("primary"), Type.Literal("secondary"), Type.Literal("tertiary")]);
const SortDirectionSchema = Type.Union([Type.Literal("asc"), Type.Literal("desc")]);
const ToneSchema = Type.Union([
  Type.Literal("success"),
  Type.Literal("warning"),
  Type.Literal("danger"),
  Type.Literal("info"),
  Type.Literal("neutral"),
]);

const FormatSchema = Type.Union([
  Type.Object({ kind: Type.Literal("text") }, { additionalProperties: false }),
  Type.Object(
    {
      kind: Type.Literal("number"),
      decimals: Type.Optional(Type.Number()),
      unit: Type.Optional(Type.String()),
      compact: Type.Optional(Type.Boolean()),
      showSign: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("currency"),
      currency: Type.String({ minLength: 1 }),
      decimals: Type.Optional(Type.Number()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("percent"),
      decimals: Type.Optional(Type.Number()),
      showSign: Type.Optional(Type.Boolean()),
      basis: Type.Optional(Type.Union([Type.Literal("fraction"), Type.Literal("unit")])),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("date"),
      dateFormat: Type.Optional(Type.Union([Type.Literal("short"), Type.Literal("long"), Type.Literal("relative")])),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("delta"),
      decimals: Type.Optional(Type.Number()),
      upIsPositive: Type.Optional(Type.Boolean()),
      showSign: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("status"),
      statusMap: Type.Record(
        Type.String(),
        Type.Object(
          {
            tone: ToneSchema,
            label: Type.Optional(Type.String()),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("boolean"),
      labels: Type.Optional(
        Type.Object(
          {
            true: Type.String(),
            false: Type.String(),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("link"),
      hrefKey: Type.Optional(Type.String()),
      external: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("badge"),
      colorMap: Type.Optional(Type.Record(Type.String(), ToneSchema)),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("array"),
      maxVisible: Type.Optional(Type.Number()),
    },
    { additionalProperties: false },
  ),
]);

const RowPrimitiveSchema = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);

export const SerializableDataTableColumnSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    label: Type.String({ minLength: 1 }),
    abbr: Type.Optional(Type.String()),
    sortable: Type.Optional(Type.Boolean()),
    align: Type.Optional(AlignSchema),
    width: Type.Optional(Type.String()),
    truncate: Type.Optional(Type.Boolean()),
    priority: Type.Optional(PrioritySchema),
    hideOnMobile: Type.Optional(Type.Boolean()),
    format: Type.Optional(FormatSchema),
  },
  { additionalProperties: false },
);

export const SerializableDataTableRowSchema = Type.Record(
  Type.String(),
  Type.Union([RowPrimitiveSchema, Type.Array(RowPrimitiveSchema)]),
);

const SortSchema = Type.Object(
  {
    by: Type.Optional(Type.String()),
    direction: Type.Optional(SortDirectionSchema),
  },
  { additionalProperties: false },
);

export const SerializableDataTableSchema = Type.Object(
  {
    id: MiniToolIdSchema,
    role: Type.Optional(MiniToolRoleSchema),
    receipt: Type.Optional(MiniToolReceiptSchema),
    columns: Type.Array(SerializableDataTableColumnSchema),
    data: Type.Array(SerializableDataTableRowSchema),
    rowIdKey: Type.Optional(Type.String()),
    defaultSort: Type.Optional(SortSchema),
    sort: Type.Optional(SortSchema),
    emptyMessage: Type.Optional(Type.String()),
    maxHeight: Type.Optional(Type.String()),
    locale: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export type SerializableDataTable = Static<typeof SerializableDataTableSchema>;
export type SerializableDataTableColumn = Static<typeof SerializableDataTableColumnSchema>;
export type SerializableDataTableRow = Static<typeof SerializableDataTableRowSchema>;

const validateSerializableDataTable = ajv.compile<SerializableDataTable>(SerializableDataTableSchema);

function validateDataTableInvariants(payload: SerializableDataTable): string | null {
  const seenColumnKeys = new Set<string>();

  for (const column of payload.columns) {
    if (seenColumnKeys.has(column.key)) {
      return `Duplicate column key: "${column.key}"`;
    }
    seenColumnKeys.add(column.key);
  }

  const sortBy = payload.sort?.by ?? payload.defaultSort?.by;
  if (sortBy && !seenColumnKeys.has(sortBy)) {
    return `Sort column "${sortBy}" does not exist in columns`;
  }

  return null;
}

export function parseSerializableDataTable(input: unknown): SerializableDataTable {
  if (!validateSerializableDataTable(input)) {
    throw new Error(ajv.errorsText(validateSerializableDataTable.errors));
  }

  const invariantError = validateDataTableInvariants(input);
  if (invariantError !== null) {
    throw new Error(invariantError);
  }

  return input;
}

export function safeParseSerializableDataTable(input: unknown): SerializableDataTable | null {
  if (!validateSerializableDataTable(input)) {
    return null;
  }

  if (validateDataTableInvariants(input) !== null) {
    return null;
  }

  return input;
}
