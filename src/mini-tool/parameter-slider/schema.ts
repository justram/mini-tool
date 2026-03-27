import { type Static, Type } from "@sinclair/typebox";
import {
  MiniToolIdSchema,
  MiniToolRoleSchema,
  SerializableActionSchema,
  SerializableActionsConfigSchema,
} from "../../shared/schema.js";
import { ajv } from "../../shared/validator.js";

export const SliderConfigSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  min: Type.Number(),
  max: Type.Number(),
  step: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  value: Type.Number(),
  unit: Type.Optional(Type.String()),
  precision: Type.Optional(Type.Integer({ minimum: 0 })),
  disabled: Type.Optional(Type.Boolean()),
  trackClassName: Type.Optional(Type.String()),
  fillClassName: Type.Optional(Type.String()),
  handleClassName: Type.Optional(Type.String()),
  fillColor: Type.Optional(Type.String()),
  fillColorDark: Type.Optional(Type.String()),
  handleColor: Type.Optional(Type.String()),
  handleColorDark: Type.Optional(Type.String()),
});

export const SerializableParameterSliderSchema = Type.Object({
  id: MiniToolIdSchema,
  role: Type.Optional(MiniToolRoleSchema),
  sliders: Type.Array(SliderConfigSchema, { minItems: 1 }),
  actions: Type.Optional(
    Type.Union([Type.Array(SerializableActionSchema, { minItems: 1 }), SerializableActionsConfigSchema]),
  ),
});

export const SliderValueSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  value: Type.Number(),
});

export type SliderConfig = Static<typeof SliderConfigSchema>;
export type SliderValue = Static<typeof SliderValueSchema>;
export type SerializableParameterSlider = Static<typeof SerializableParameterSliderSchema>;

const validateSerializableParameterSlider = ajv.compile<SerializableParameterSlider>(SerializableParameterSliderSchema);

function validateInvariants(input: SerializableParameterSlider): string[] {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  input.sliders.forEach((slider, index) => {
    if (seenIds.has(slider.id)) {
      issues.push(`Duplicate slider id "${slider.id}" at sliders[${index}] is not allowed.`);
      return;
    }

    seenIds.add(slider.id);

    if (slider.max <= slider.min) {
      issues.push(`Slider "${slider.id}" must satisfy max > min.`);
    }

    if (slider.value < slider.min || slider.value > slider.max) {
      issues.push(`Slider "${slider.id}" value must be within [min, max].`);
    }
  });

  return issues;
}

export function parseSerializableParameterSlider(input: unknown): SerializableParameterSlider {
  if (!validateSerializableParameterSlider(input)) {
    throw new Error(ajv.errorsText(validateSerializableParameterSlider.errors));
  }

  const invariantIssues = validateInvariants(input);
  if (invariantIssues.length > 0) {
    throw new Error(invariantIssues.join(" "));
  }

  return input;
}

export function safeParseSerializableParameterSlider(input: unknown): SerializableParameterSlider | null {
  if (!validateSerializableParameterSlider(input)) {
    return null;
  }

  if (validateInvariants(input).length > 0) {
    return null;
  }

  return input;
}
