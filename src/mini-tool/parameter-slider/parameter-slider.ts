import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import stylesText from "./parameter-slider.css?inline";
import type { SerializableParameterSlider, SliderValue } from "./schema.js";

type ActionVariant = "default" | "destructive" | "secondary" | "ghost" | "outline";

type ActionItem = {
  id: string;
  label: string;
  disabled?: boolean;
  variant?: ActionVariant;
};

type ActionsConfig = {
  items: ActionItem[];
  align: "left" | "center" | "right";
};

function toPercent(value: number, min: number, max: number): number {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return 0;
  }

  const normalized = ((value - min) / span) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function formatValue(
  value: number,
  min: number,
  max: number,
  precision: number | undefined,
  unit: string | undefined,
): string {
  const hasSign = min < 0 && max > 0;
  const valueText = precision === undefined ? String(value) : value.toFixed(precision);
  const signedText = hasSign && value >= 0 ? `+${valueText}` : valueText;
  return unit ? `${signedText} ${unit}` : signedText;
}

function ariaValueText(value: number, unit: string | undefined): string {
  if (value > 0) {
    return unit ? `plus ${value} ${unit}` : `plus ${value}`;
  }

  if (value < 0) {
    const abs = Math.abs(value);
    return unit ? `minus ${abs} ${unit}` : `minus ${abs}`;
  }

  return unit ? `0 ${unit}` : "0";
}

const TRACK_EDGE_INSET_PX = 4;

function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.max(0, Math.min(100, percent));
}

function toInsetPosition(percent: number): string {
  const safePercent = clampPercent(percent);
  return `calc(${TRACK_EDGE_INSET_PX}px + (100% - ${TRACK_EDGE_INSET_PX * 2}px) * ${safePercent / 100})`;
}

function resolveFillInsets(value: number, min: number, max: number): { left: string; right: string } {
  const valuePercent = toPercent(value, min, max);
  const crossesZero = min < 0 && max > 0;

  const lowPercent = crossesZero ? Math.min(valuePercent, toPercent(0, min, max)) : 0;
  const highPercent = crossesZero ? Math.max(valuePercent, toPercent(0, min, max)) : valuePercent;

  return {
    left: toInsetPosition(lowPercent),
    right: `calc(100% - ${toInsetPosition(highPercent)})`,
  };
}

function tickPercents(min: number, max: number): Array<{ percent: number; major: boolean; edge: boolean }> {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return [];
  }

  const canUseIntegerTicks = Number.isInteger(min) && Number.isInteger(max) && span <= 48;
  const majorStep = canUseIntegerTicks ? 1 : span / 16;
  const estimatedMajorCount = Math.floor(span / majorStep) + 1;

  if (!Number.isFinite(majorStep) || majorStep <= 0 || estimatedMajorCount < 2 || estimatedMajorCount > 64) {
    const fallbackCount = 32;
    return Array.from({ length: fallbackCount + 1 }, (_, index) => ({
      percent: (index / fallbackCount) * 100,
      major: index % 2 === 0,
      edge: index === 0 || index === fallbackCount,
    }));
  }

  const ticks: Array<{ percent: number; major: boolean; edge: boolean }> = [];

  for (let index = 0; index < estimatedMajorCount; index += 1) {
    const value = min + majorStep * index;
    const percent = toPercent(value, min, max);

    ticks.push({
      percent,
      major: true,
      edge: index === 0 || index === estimatedMajorCount - 1,
    });

    if (index < estimatedMajorCount - 1) {
      const nextValue = min + majorStep * (index + 1);
      const midpointPercent = toPercent((value + nextValue) / 2, min, max);
      ticks.push({
        percent: midpointPercent,
        major: false,
        edge: false,
      });
    }
  }

  return ticks;
}

@customElement("mini-tool-parameter-slider")
export class MiniToolParameterSlider extends LitElement {
  @property({ attribute: false })
  payload!: SerializableParameterSlider;

  @state()
  private values: SliderValue[] = [];

  @state()
  private focusedSliderId: string | null = null;

  @state()
  private draggingSliderId: string | null = null;

  static styles = unsafeCSS(stylesText);

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload) {
      return;
    }

    this.values = this.payload.sliders.map((slider) => ({ id: slider.id, value: slider.value }));
  }

  private getActionsConfig(): ActionsConfig {
    if (!this.payload.actions) {
      return {
        align: "right",
        items: [
          { id: "reset", label: "Reset", variant: "ghost" },
          { id: "apply", label: "Apply", variant: "default" },
        ],
      };
    }

    if (Array.isArray(this.payload.actions)) {
      return {
        align: "right",
        items: this.payload.actions.map((action) => ({
          id: action.id,
          label: action.label,
          disabled: action.disabled,
          variant: action.variant,
        })),
      };
    }

    return {
      align: this.payload.actions.align ?? "right",
      items: this.payload.actions.items.map((action) => ({
        id: action.id,
        label: action.label,
        disabled: action.disabled,
        variant: action.variant,
      })),
    };
  }

  private valuesSnapshot(): SliderValue[] {
    return this.values.map((value) => ({ ...value }));
  }

  private resetValues(): void {
    this.values = this.payload.sliders.map((slider) => ({ id: slider.id, value: slider.value }));
  }

  private emitAction(actionId: string): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:parameter-slider-action", {
        detail: {
          actionId,
          values: this.valuesSnapshot(),
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleActionClick(actionId: string): void {
    if (actionId === "reset") {
      this.resetValues();
    }

    this.emitAction(actionId);
  }

  private handleSliderInput(sliderId: string, event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const nextValue = Number(target.value);

    this.values = this.values.map((entry) => {
      if (entry.id !== sliderId) {
        return entry;
      }

      return {
        id: entry.id,
        value: nextValue,
      };
    });
  }

  private handleSliderFocus(sliderId: string): void {
    this.focusedSliderId = sliderId;
  }

  private handleSliderBlur(sliderId: string): void {
    if (this.focusedSliderId === sliderId) {
      this.focusedSliderId = null;
    }

    if (this.draggingSliderId === sliderId) {
      this.draggingSliderId = null;
    }
  }

  private handleSliderPointerDown(sliderId: string): void {
    this.draggingSliderId = sliderId;
  }

  private handleSliderPointerUp(sliderId: string): void {
    if (this.draggingSliderId === sliderId) {
      this.draggingSliderId = null;
    }
  }

  private resolveValue(sliderId: string, fallbackValue: number): number {
    const found = this.values.find((entry) => entry.id === sliderId);
    return found?.value ?? fallbackValue;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const actions = this.getActionsConfig();
    const alignmentClass = `actions align-${actions.align}`;

    return html`
      <article class="root" data-slot="parameter-slider" data-mini-tool-id=${this.payload.id}>
        <section class="surface" role="group" aria-label="Parameter controls">
          ${this.payload.sliders.map((slider) => {
            const value = this.resolveValue(slider.id, slider.value);
            const step = slider.step ?? 1;
            const sliderTrackClass = slider.trackClassName ?? "";
            const sliderFillClass = slider.fillClassName ?? "";
            const sliderHandleClass = slider.handleClassName ?? "";
            const valuePercent = toPercent(value, slider.min, slider.max);
            const fillInsets = resolveFillInsets(value, slider.min, slider.max);

            const rowStyles: Record<string, string> = {};
            if (slider.fillColor) rowStyles["--slider-fill-light"] = slider.fillColor;
            if (slider.fillColorDark) rowStyles["--slider-fill-dark"] = slider.fillColorDark;
            if (slider.handleColor) rowStyles["--slider-handle-light"] = slider.handleColor;
            if (slider.handleColorDark) rowStyles["--slider-handle-dark"] = slider.handleColorDark;

            const isFocused = this.focusedSliderId === slider.id;
            const isDragging = this.draggingSliderId === slider.id;
            const interactionClass = isDragging ? "is-dragging" : isFocused ? "is-interacting" : "";

            return html`
              <div class="slider-row" data-slider-id=${slider.id} style=${styleMap(rowStyles)}>
                <div class=${`track-shell ${interactionClass} ${sliderTrackClass}`.trim()}>
                  <div class="track-fill ${sliderFillClass}" style=${`left:${fillInsets.left};right:${fillInsets.right};`}></div>
                  <div class=${`value-marker ${sliderHandleClass}`} style=${`left:${toInsetPosition(valuePercent)}`}></div>
                  <div class="tick-rail" aria-hidden="true">
                    ${tickPercents(slider.min, slider.max).map((tick) => {
                      const tickClass = ["tick", tick.major ? "major" : "minor", tick.edge ? "edge" : ""]
                        .filter(Boolean)
                        .join(" ");
                      return html`<span class=${tickClass} style=${`left:${toInsetPosition(tick.percent)}`}></span>`;
                    })}
                  </div>
                  <div class="text-overlay" aria-hidden="true">
                    <span class="label">${slider.label}</span>
                    <span class="value">${formatValue(value, slider.min, slider.max, slider.precision, slider.unit)}</span>
                  </div>
                  <input
                    id=${slider.id}
                    class=${`slider-input ${sliderHandleClass}`}
                    type="range"
                    min=${String(slider.min)}
                    max=${String(slider.max)}
                    step=${String(step)}
                    .value=${String(value)}
                    ?disabled=${slider.disabled ?? false}
                    aria-label=${slider.label}
                    aria-valuetext=${ariaValueText(value, slider.unit)}
                    @input=${(event: Event) => this.handleSliderInput(slider.id, event)}
                    @focus=${() => this.handleSliderFocus(slider.id)}
                    @blur=${() => this.handleSliderBlur(slider.id)}
                    @pointerdown=${() => this.handleSliderPointerDown(slider.id)}
                    @pointerup=${() => this.handleSliderPointerUp(slider.id)}
                    @pointercancel=${() => this.handleSliderPointerUp(slider.id)}
                  />
                </div>
              </div>
            `;
          })}
        </section>

        <div class=${alignmentClass} role="group" aria-label="Slider actions">
          ${actions.items.map(
            (action) => html`
              <button
                class=${`action variant-${action.variant ?? "default"}`}
                type="button"
                data-action-id=${action.id}
                ?disabled=${action.disabled ?? false}
                @click=${() => this.handleActionClick(action.id)}
              >
                ${action.label}
              </button>
            `,
          )}
        </div>
      </article>
    `;
  }
}
