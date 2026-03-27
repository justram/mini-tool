import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyParameterSliderInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "parameter-slider-audio-eq",
    sliders: [
      {
        id: "bass",
        label: "Bass",
        min: -12,
        max: 12,
        step: 0.1,
        value: 3,
        unit: "dB",
        precision: 1,
      },
      {
        id: "mid",
        label: "Mid",
        min: -12,
        max: 12,
        step: 0.1,
        value: -2,
        unit: "dB",
        precision: 1,
      },
      {
        id: "treble",
        label: "Treble",
        min: -12,
        max: 12,
        step: 0.1,
        value: 4,
        unit: "dB",
        precision: 1,
      },
    ],
    actions: [
      { id: "reset", label: "Flat", variant: "ghost" },
      { id: "apply", label: "Apply", variant: "default" },
    ],
  };
}
