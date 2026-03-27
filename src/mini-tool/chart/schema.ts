import { type Static, Type } from "@sinclair/typebox";
import { MiniToolIdSchema, MiniToolReceiptSchema, MiniToolRoleSchema } from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const ChartTypeSchema = Type.Union([Type.Literal("bar"), Type.Literal("line")]);

export const ChartSeriesSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    label: Type.String({ minLength: 1 }),
    color: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const ChartDatumSchema = Type.Record(Type.String(), Type.Unknown());

export const SerializableChartSchema = Type.Object(
  {
    id: MiniToolIdSchema,
    role: Type.Optional(MiniToolRoleSchema),
    receipt: Type.Optional(MiniToolReceiptSchema),
    type: ChartTypeSchema,
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    data: Type.Array(ChartDatumSchema, { minItems: 1 }),
    xKey: Type.String({ minLength: 1 }),
    series: Type.Array(ChartSeriesSchema, { minItems: 1 }),
    colors: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
    showLegend: Type.Optional(Type.Boolean()),
    showGrid: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export type ChartType = Static<typeof ChartTypeSchema>;
export type ChartSeries = Static<typeof ChartSeriesSchema>;
export type ChartDatum = Static<typeof ChartDatumSchema>;
export type SerializableChart = Static<typeof SerializableChartSchema>;

export type ChartDataPoint = {
  seriesKey: string;
  seriesLabel: string;
  xValue: unknown;
  yValue: unknown;
  index: number;
  payload: Record<string, unknown>;
};

const validateSerializableChart = ajv.compile<SerializableChart>(SerializableChartSchema);

function validateChartInvariants(payload: SerializableChart): string | null {
  const seenSeriesKeys = new Set<string>();
  for (const series of payload.series) {
    if (seenSeriesKeys.has(series.key)) {
      return `Duplicate series key "${series.key}".`;
    }
    seenSeriesKeys.add(series.key);
  }

  payload.data.forEach((row, rowIndex) => {
    if (!(payload.xKey in row)) {
      throw new Error(`Missing xKey "${payload.xKey}" in data row ${rowIndex}.`);
    }

    const xValue = row[payload.xKey];
    if (typeof xValue !== "string" && typeof xValue !== "number") {
      throw new Error(`Expected "${payload.xKey}" to be a string or number in data row ${rowIndex}.`);
    }

    for (const series of payload.series) {
      if (!(series.key in row)) {
        throw new Error(`Missing series key "${series.key}" in data row ${rowIndex}.`);
      }

      const yValue = row[series.key];
      if (yValue === null) {
        continue;
      }
      if (typeof yValue !== "number" || !Number.isFinite(yValue)) {
        throw new Error(`Expected "${series.key}" to be a finite number (or null) in data row ${rowIndex}.`);
      }
    }
  });

  return null;
}

export function parseSerializableChart(input: unknown): SerializableChart {
  if (!validateSerializableChart(input)) {
    throw new Error(ajv.errorsText(validateSerializableChart.errors));
  }

  const invariantError = validateChartInvariants(input);
  if (invariantError) {
    throw new Error(invariantError);
  }

  return input;
}

export function safeParseSerializableChart(input: unknown): SerializableChart | null {
  if (!validateSerializableChart(input)) {
    return null;
  }

  try {
    const invariantError = validateChartInvariants(input);
    if (invariantError) {
      return null;
    }
    return input;
  } catch {
    return null;
  }
}
