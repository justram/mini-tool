import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { type BenchmarkComponent, benchmarkComponents, isBenchmarkComponent } from "./component-registry";

type Parser = (input: unknown) => unknown;

type AdapterDefinition = {
  component: BenchmarkComponent;
  schema: z.ZodTypeAny;
  invariant?: (input: unknown) => void;
};

type SourceSchemaModuleConfig = {
  file: string;
  exportName: string;
  invariant?: (input: unknown) => void;
};

const SOURCE_SCHEMA_MODULES: Record<Exclude<BenchmarkComponent, "citation-list">, SourceSchemaModuleConfig> = {
  "approval-card": {
    file: "approval-card/schema.ts",
    exportName: "SerializableApprovalCardSchema",
  },
  audio: {
    file: "audio/schema.ts",
    exportName: "SerializableAudioSchema",
  },
  chart: {
    file: "chart/schema.ts",
    exportName: "SerializableChartSchema",
    invariant: ensureChartInvariants,
  },
  citation: {
    file: "citation/schema.ts",
    exportName: "SerializableCitationSchema",
  },
  "code-block": {
    file: "code-block/schema.ts",
    exportName: "SerializableCodeBlockSchema",
  },
  "code-diff": {
    file: "code-diff/schema.ts",
    exportName: "SerializableCodeDiffSchema",
    invariant: ensureCodeDiffMode,
  },
  "data-table": {
    file: "data-table/schema.ts",
    exportName: "SerializableDataTableSchema",
  },
  image: {
    file: "image/schema.ts",
    exportName: "SerializableImageSchema",
  },
  "image-gallery": {
    file: "image-gallery/schema.ts",
    exportName: "SerializableImageGallerySchema",
  },
  "geo-map": {
    file: "geo-map/schema.ts",
    exportName: "SerializableGeoMapSchema",
  },
  "instagram-post": {
    file: "instagram-post/schema.ts",
    exportName: "SerializableInstagramPostSchema",
  },
  "item-carousel": {
    file: "item-carousel/schema.ts",
    exportName: "SerializableItemCarouselSchema",
  },
  "link-preview": {
    file: "link-preview/schema.ts",
    exportName: "SerializableLinkPreviewSchema",
  },
  "linkedin-post": {
    file: "linkedin-post/schema.ts",
    exportName: "SerializableLinkedInPostSchema",
  },
  "message-draft": {
    file: "message-draft/schema.ts",
    exportName: "SerializableMessageDraftSchema",
  },
  "option-list": {
    file: "option-list/schema.ts",
    exportName: "SerializableOptionListSchema",
    invariant: ensureOptionListInvariants,
  },
  "order-summary": {
    file: "order-summary/schema.ts",
    exportName: "SerializableOrderSummarySchema",
  },
  "parameter-slider": {
    file: "parameter-slider/schema.ts",
    exportName: "SerializableParameterSliderSchema",
    invariant: ensureParameterSliderInvariants,
  },
  plan: {
    file: "plan/schema.ts",
    exportName: "SerializablePlanSchema",
    invariant: ensurePlanInvariants,
  },
  "preferences-panel": {
    file: "preferences-panel/schema.ts",
    exportName: "SerializablePreferencesPanelSchema",
  },
  "progress-tracker": {
    file: "progress-tracker/schema.ts",
    exportName: "SerializableProgressTrackerSchema",
    invariant: ensureProgressTrackerInvariants,
  },
  "question-flow": {
    file: "question-flow/schema.ts",
    exportName: "SerializableQuestionFlowSchema",
    invariant: ensureQuestionFlowInvariants,
  },
  "stats-display": {
    file: "stats-display/schema.ts",
    exportName: "SerializableStatsDisplaySchema",
  },
  terminal: {
    file: "terminal/schema.ts",
    exportName: "SerializableTerminalSchema",
  },
  video: {
    file: "video/schema.ts",
    exportName: "SerializableVideoSchema",
  },
  "x-post": {
    file: "x-post/schema.ts",
    exportName: "SerializableXPostSchema",
  },
};

function resolveSourceModuleUrl(relativePath: string): string {
  return pathToFileURL(resolve(process.cwd(), "../tool-ui/apps/www/components/tool-ui", relativePath)).href;
}

async function loadNamedExport(relativePath: string, exportName: string): Promise<unknown> {
  const moduleUrl = resolveSourceModuleUrl(relativePath);
  const mod = (await import(moduleUrl)) as Record<string, unknown>;
  const value = mod[exportName];

  if (value === undefined) {
    throw new Error(`Missing export '${exportName}' from ${relativePath}`);
  }

  return value;
}

function formatZodError(result: z.ZodSafeParseResult<unknown>): string {
  if (result.success) {
    return "unknown zod parse failure";
  }

  return result.error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function buildSourceParser(definition: AdapterDefinition): Parser {
  return (input: unknown): unknown => {
    const result = definition.schema.safeParse(input);
    if (!result.success) {
      throw new Error(formatZodError(result));
    }

    definition.invariant?.(result.data);
    return result.data;
  };
}

function ensureCodeDiffMode(input: unknown): void {
  const payload = input as { oldCode?: unknown; newCode?: unknown; patch?: unknown };
  const hasPatch = typeof payload.patch === "string";
  const hasFilePair = typeof payload.oldCode === "string" || typeof payload.newCode === "string";

  if (!hasPatch && !hasFilePair) {
    throw new Error("Provide either a patch string or at least one of oldCode/newCode");
  }

  if (hasPatch && hasFilePair) {
    throw new Error("Cannot mix patch mode with oldCode/newCode — use one or the other");
  }
}

function ensureUniqueIds(values: string[], scope: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${scope} id '${value}'.`);
    }
    seen.add(value);
  }
}

function ensureChartInvariants(input: unknown): void {
  const payload = input as {
    xKey: string;
    data: Array<Record<string, unknown>>;
    series: Array<{ key: string }>;
  };

  ensureUniqueIds(
    payload.series.map((series) => series.key),
    "series",
  );

  payload.data.forEach((row, rowIndex) => {
    if (!(payload.xKey in row)) {
      throw new Error(`Missing xKey '${payload.xKey}' in data row ${rowIndex}.`);
    }

    const xValue = row[payload.xKey];
    if (typeof xValue !== "string" && typeof xValue !== "number") {
      throw new Error(`Expected '${payload.xKey}' to be a string or number in data row ${rowIndex}.`);
    }

    payload.series.forEach((series) => {
      if (!(series.key in row)) {
        throw new Error(`Missing series key '${series.key}' in data row ${rowIndex}.`);
      }

      const yValue = row[series.key];
      if (yValue === null) {
        return;
      }

      if (typeof yValue !== "number" || !Number.isFinite(yValue)) {
        throw new Error(`Expected '${series.key}' to be a finite number (or null) in data row ${rowIndex}.`);
      }
    });
  });
}

function ensureOptionListInvariants(input: unknown): void {
  const payload = input as {
    options: Array<{ id: string }>;
    minSelections?: number;
    maxSelections?: number;
    defaultValue?: string[] | string | null;
    choice?: string[] | string | null;
  };

  if (
    payload.minSelections !== undefined &&
    payload.maxSelections !== undefined &&
    payload.minSelections > payload.maxSelections
  ) {
    throw new Error("'minSelections' cannot be greater than 'maxSelections'.");
  }

  const optionIds = payload.options.map((option) => option.id);
  ensureUniqueIds(optionIds, "option");

  const allowed = new Set(optionIds);
  const selectionFields: Array<["defaultValue" | "choice", string[] | string | null | undefined]> = [
    ["defaultValue", payload.defaultValue],
    ["choice", payload.choice],
  ];

  selectionFields.forEach(([field, selection]) => {
    if (selection == null) {
      return;
    }

    const ids = Array.isArray(selection) ? selection : [selection];
    ids.forEach((id) => {
      if (!allowed.has(id)) {
        throw new Error(`Selection id '${id}' in '${field}' must exist in options.`);
      }
    });
  });
}

function ensureParameterSliderInvariants(input: unknown): void {
  const payload = input as {
    sliders: Array<{ id: string; min: number; max: number; value: number }>;
  };

  ensureUniqueIds(
    payload.sliders.map((slider) => slider.id),
    "slider",
  );

  payload.sliders.forEach((slider) => {
    if (slider.max <= slider.min) {
      throw new Error("max must be greater than min");
    }

    if (slider.value < slider.min || slider.value > slider.max) {
      throw new Error("value must be between min and max");
    }
  });
}

function ensurePlanInvariants(input: unknown): void {
  const payload = input as { todos: Array<{ id: string }> };
  ensureUniqueIds(
    payload.todos.map((todo) => todo.id),
    "todo",
  );
}

function ensureProgressTrackerInvariants(input: unknown): void {
  const payload = input as { steps: Array<{ id: string }> };
  ensureUniqueIds(
    payload.steps.map((step) => step.id),
    "step",
  );
}

function ensureQuestionFlowInvariants(input: unknown): void {
  const payload = input as {
    steps?: Array<{ id: string; options: Array<{ id: string }> }>;
    options?: Array<{ id: string }>;
  };

  if (Array.isArray(payload.steps)) {
    ensureUniqueIds(
      payload.steps.map((step) => step.id),
      "step",
    );

    payload.steps.forEach((step, stepIndex) => {
      ensureUniqueIds(
        step.options.map((option) => option.id),
        `option for steps[${stepIndex}]`,
      );
    });

    return;
  }

  if (Array.isArray(payload.options)) {
    ensureUniqueIds(
      payload.options.map((option) => option.id),
      "option",
    );
  }
}

function ensureCitationListInvariants(input: unknown): void {
  const payload = input as { citations: Array<{ id: string }> };
  ensureUniqueIds(
    payload.citations.map((citation) => citation.id),
    "citation",
  );
}

async function loadCitationListSchema(): Promise<z.ZodTypeAny> {
  const toolUiIdSchema = (await loadNamedExport("shared/schema.ts", "ToolUIIdSchema")) as z.ZodTypeAny;
  const serializableCitationSchema = (await loadNamedExport(
    "citation/schema.ts",
    "SerializableCitationSchema",
  )) as z.ZodTypeAny;
  const citationVariantSchema = (await loadNamedExport("citation/schema.ts", "CitationVariantSchema")) as z.ZodTypeAny;

  return z.object({
    id: toolUiIdSchema,
    citations: z.array(serializableCitationSchema).min(1),
    variant: citationVariantSchema.optional(),
    maxVisible: z.number().min(1).optional(),
  });
}

async function buildAdapters(): Promise<Map<BenchmarkComponent, Parser>> {
  const definitions: AdapterDefinition[] = [];

  for (const component of benchmarkComponents) {
    if (component === "citation-list") {
      definitions.push({
        component,
        schema: await loadCitationListSchema(),
        invariant: ensureCitationListInvariants,
      });
      continue;
    }

    const config = SOURCE_SCHEMA_MODULES[component];
    const schema = (await loadNamedExport(config.file, config.exportName)) as z.ZodTypeAny;
    definitions.push({
      component,
      schema,
      invariant: config.invariant,
    });
  }

  return new Map<BenchmarkComponent, Parser>(
    definitions.map((definition) => [definition.component, buildSourceParser(definition)]),
  );
}

const parserByComponent = await buildAdapters();

export function getSourceEquivalentParser(component: string): Parser {
  if (!isBenchmarkComponent(component)) {
    throw new Error(`Unsupported component '${component}' for source baseline script.`);
  }

  return parserByComponent.get(component)!;
}

export function supportedSourceAdapterComponents(): string[] {
  return benchmarkComponents.slice().sort();
}
