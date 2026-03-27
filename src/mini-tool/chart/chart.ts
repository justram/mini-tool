import { html, LitElement, nothing, svg, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./chart.css?inline";
import type { ChartDataPoint, ChartSeries, SerializableChart } from "./schema.js";

const DEFAULT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function computeNiceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const normalized = rawStep / magnitude;
  const candidates = [1, 1.5, 2, 2.5, 5, 10];

  for (const candidate of candidates) {
    if (normalized <= candidate) {
      return candidate * magnitude;
    }
  }

  return 10 * magnitude;
}

type NormalizedDatum = {
  index: number;
  x: number;
  xValue: string | number;
  y: number | null;
  raw: Record<string, unknown>;
};

type ActiveTooltip = {
  index: number;
  x: number;
  y: number;
};

@customElement("mini-tool-chart")
export class MiniToolChart extends LitElement {
  @property({ attribute: false })
  payload!: SerializableChart;

  @state()
  private activeTooltip: ActiveTooltip | null = null;

  static styles = unsafeCSS(stylesText);

  private emitDataPoint(point: ChartDataPoint): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:chart-data-point-click", {
        detail: point,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private resolveSeriesColors(): string[] {
    const palette = this.payload.colors?.length ? this.payload.colors : DEFAULT_COLORS;
    return this.payload.series.map((seriesItem, index) => {
      return seriesItem.color ?? palette[index % palette.length];
    });
  }

  private buildSeriesData(seriesKey: string, left: number, width: number): NormalizedDatum[] {
    const step = this.payload.data.length > 1 ? width / (this.payload.data.length - 1) : width / 2;

    return this.payload.data.map((row, index) => {
      const raw = row as Record<string, unknown>;
      const yValue = raw[seriesKey];
      return {
        index,
        x: this.payload.data.length > 1 ? left + step * index : left + width / 2,
        xValue: raw[this.payload.xKey] as string | number,
        y: typeof yValue === "number" && Number.isFinite(yValue) ? yValue : null,
        raw,
      };
    });
  }

  private getScaleBounds(): { min: number; max: number; ticks: number[] } {
    const values: number[] = [];
    for (const row of this.payload.data) {
      const typedRow = row as Record<string, unknown>;
      for (const series of this.payload.series) {
        const y = typedRow[series.key];
        if (typeof y === "number" && Number.isFinite(y)) {
          values.push(y);
        }
      }
    }

    if (values.length === 0) {
      return { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
    }

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const segments = 4;
    if (rawMin >= 0) {
      const step = computeNiceStep(rawMax / segments);
      const max = Math.max(step, Math.ceil(rawMax / step) * step);
      const ticks = Array.from({ length: segments + 1 }, (_, index) => index * step);
      return { min: 0, max, ticks };
    }

    const span = rawMax - rawMin || 1;
    const step = computeNiceStep(span / segments);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step;
    const tickCount = Math.round((max - min) / step);
    const ticks = Array.from({ length: tickCount + 1 }, (_, index) => min + step * index);

    return { min, max, ticks };
  }

  private toY(value: number, top: number, height: number, min: number, max: number): number {
    const ratio = (value - min) / (max - min);
    return top + (1 - ratio) * height;
  }

  private onPointActivate(series: ChartSeries, row: Record<string, unknown>, index: number): void {
    this.emitDataPoint({
      seriesKey: series.key,
      seriesLabel: series.label,
      xValue: row[this.payload.xKey],
      yValue: row[series.key],
      index,
      payload: row,
    });
  }

  private showTooltip(index: number, x: number, y: number): void {
    this.activeTooltip = { index, x, y };
  }

  private hideTooltip(): void {
    this.activeTooltip = null;
  }

  private renderTooltip(
    chartViewWidth: number,
    chartViewHeight: number,
    colors: string[],
  ): TemplateResult | typeof nothing {
    if (!this.activeTooltip) {
      return nothing;
    }

    const row = this.payload.data[this.activeTooltip.index] as Record<string, unknown> | undefined;
    if (!row) {
      return nothing;
    }

    const xValue = row[this.payload.xKey];
    const leftPercent = (this.activeTooltip.x / chartViewWidth) * 100;
    const topPercent = (this.activeTooltip.y / chartViewHeight) * 100;

    return html`
      <div
        class="chart-tooltip"
        role="tooltip"
        style=${`left:${leftPercent}%;top:${topPercent}%;`}
      >
        <div class="chart-tooltip-label">${String(xValue)}</div>
        ${this.payload.series.map((series, index) => {
          const value = row[series.key];
          return html`
            <div class="chart-tooltip-row">
              <div class="chart-tooltip-row-left">
                <span class="chart-tooltip-indicator" style=${`background-color:${colors[index]};`}></span>
                <span class="chart-tooltip-series">${series.label}</span>
              </div>
              <span class="chart-tooltip-value">${typeof value === "number" ? value.toLocaleString() : "—"}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderXAxisLabels(left: number, width: number, baseline: number, mode: "bar" | "line"): TemplateResult[] {
    if (mode === "bar") {
      const groupWidth = this.payload.data.length > 0 ? width / this.payload.data.length : width;
      return this.payload.data.map((row, index) => {
        const typedRow = row as Record<string, unknown>;
        const x = left + groupWidth * index + groupWidth / 2;
        return svg`<text class="axis-label" x=${x} y=${baseline + 18}>${String(typedRow[this.payload.xKey])}</text>`;
      });
    }

    const step = this.payload.data.length > 1 ? width / (this.payload.data.length - 1) : width / 2;

    return this.payload.data.map((row, index) => {
      const typedRow = row as Record<string, unknown>;
      const x = this.payload.data.length > 1 ? left + step * index : left + width / 2;
      return svg`<text class="axis-label" x=${x} y=${baseline + 18}>${String(typedRow[this.payload.xKey])}</text>`;
    });
  }

  private renderGrid(
    left: number,
    top: number,
    width: number,
    height: number,
    min: number,
    max: number,
    ticks: number[],
  ): TemplateResult {
    const rows = [...ticks].reverse().map((value) => {
      const y = this.toY(value, top, height, min, max);
      return svg`
          <line class="grid-line" x1=${left} y1=${y} x2=${left + width} y2=${y}></line>
          <text class="axis-label y" x=${left - 8} y=${y + 4}>${Math.round(value).toString()}</text>
        `;
    });

    return svg`${rows}`;
  }

  private renderBarSeries(
    series: ChartSeries,
    color: string,
    seriesIndex: number,
    left: number,
    top: number,
    width: number,
    height: number,
    min: number,
    max: number,
  ): TemplateResult[] {
    const groupWidth = this.payload.data.length > 0 ? width / this.payload.data.length : width;
    const usableGroupWidth = Math.max(12, groupWidth * 0.9);
    const barGap = 4;
    const barWidth = (usableGroupWidth - barGap * (this.payload.series.length - 1)) / this.payload.series.length;

    return this.payload.data.map((row, index) => {
      const typedRow = row as Record<string, unknown>;
      const rawY = typedRow[series.key];
      if (typeof rawY !== "number" || !Number.isFinite(rawY)) {
        return svg``;
      }

      const zeroY = this.toY(0, top, height, min, max);
      const valueY = this.toY(rawY, top, height, min, max);
      const barHeight = Math.max(1, Math.abs(zeroY - valueY));
      const x = left + groupWidth * index + (groupWidth - usableGroupWidth) / 2 + seriesIndex * (barWidth + barGap);
      const y = rawY >= 0 ? valueY : zeroY;

      const onActivate = () => this.onPointActivate(series, typedRow, index);
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      };
      const onFocus = () => this.showTooltip(index, x + Math.max(2, barWidth) / 2, y);
      const onMouseEnter = () => this.showTooltip(index, x + Math.max(2, barWidth) / 2, y);

      const barDelayMs = index * 55 + seriesIndex * 80;

      return svg`
        <rect
          class="bar animated"
          style=${`--bar-delay: ${barDelayMs}ms;`}
          x=${x}
          y=${y}
          width=${Math.max(2, barWidth)}
          height=${barHeight}
          rx="4"
          fill=${color}
          role="button"
          tabindex="0"
          aria-label=${`${series.label} ${typedRow[this.payload.xKey]} ${rawY}`}
          @click=${onActivate}
          @keydown=${onKeydown}
          @focus=${onFocus}
          @blur=${this.hideTooltip}
          @mouseenter=${onMouseEnter}
          @mouseleave=${this.hideTooltip}
        ></rect>
      `;
    });
  }

  private renderTooltipCursor(
    left: number,
    top: number,
    width: number,
    height: number,
    mode: "bar" | "line",
  ): TemplateResult | typeof nothing {
    if (!this.activeTooltip) {
      return nothing;
    }

    const count = this.payload.data.length;
    if (count <= 0) {
      return nothing;
    }

    if (mode === "bar") {
      const groupWidth = width / count;
      const x = left + groupWidth * this.activeTooltip.index;
      return svg`<rect class="tooltip-cursor" x=${x} y=${top} width=${groupWidth} height=${height}></rect>`;
    }

    const step = count > 1 ? width / (count - 1) : width / 2;
    const centerX = count > 1 ? left + step * this.activeTooltip.index : left + width / 2;
    const cursorWidth = Math.max(28, step);
    const x = centerX - cursorWidth / 2;

    return svg`<rect class="tooltip-cursor" x=${x} y=${top} width=${cursorWidth} height=${height}></rect>`;
  }

  private renderLineSeries(
    series: ChartSeries,
    color: string,
    seriesIndex: number,
    left: number,
    top: number,
    width: number,
    height: number,
    min: number,
    max: number,
  ): TemplateResult {
    const points = this.buildSeriesData(series.key, left, width);

    let path = "";

    for (const point of points) {
      if (point.y === null) {
        continue;
      }

      const y = this.toY(point.y, top, height, min, max);
      if (!path) {
        path = `M ${point.x} ${y}`;
      } else {
        path += ` L ${point.x} ${y}`;
      }
    }

    const dots = points.map((point) => {
      if (point.y === null) {
        return svg``;
      }
      const y = this.toY(point.y, top, height, min, max);
      const onActivate = () => this.onPointActivate(series, point.raw, point.index);
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      };
      const onFocus = () => this.showTooltip(point.index, point.x, y);
      const onMouseEnter = () => this.showTooltip(point.index, point.x, y);
      const dotDelayMs = 110 + seriesIndex * 90 + point.index * 40;

      return svg`
        <circle
          class="data-point animated"
          style=${`--dot-delay: ${dotDelayMs}ms;`}
          cx=${point.x}
          cy=${y}
          r="4"
          fill=${color}
          role="button"
          tabindex="0"
          aria-label=${`${series.label} ${point.xValue} ${point.y}`}
          @click=${onActivate}
          @keydown=${onKeydown}
          @focus=${onFocus}
          @blur=${this.hideTooltip}
          @mouseenter=${onMouseEnter}
          @mouseleave=${this.hideTooltip}
        ></circle>
      `;
    });

    const lineDelayMs = seriesIndex * 90;

    return svg`
      <path
        class="series-line animated"
        style=${`--line-delay: ${lineDelayMs}ms;`}
        d=${path}
        stroke=${color}
      ></path>
      ${dots}
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const colors = this.resolveSeriesColors();
    const { min, max, ticks } = this.getScaleBounds();
    const chartViewWidth = 456;
    const chartViewHeight = 220;
    const left = 62;
    const top = 10;
    const right = 18;
    const bottom = 38;
    const width = chartViewWidth - left - right;
    const height = chartViewHeight - top - bottom;
    const showLegend = this.payload.showLegend ?? false;
    const showGrid = this.payload.showGrid ?? true;

    return html`
      <article data-mini-tool-id=${this.payload.id} data-slot="chart" class="container">
        <div class="card">
          ${
            this.payload.title || this.payload.description
              ? html`
                <header class="header">
                  ${this.payload.title ? html`<h2 class="title">${this.payload.title}</h2>` : nothing}
                  ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
                </header>
              `
              : nothing
          }
          <div class="chart-root">
            <div class="svg-wrap">
              <svg class="svg" viewBox=${`0 0 ${chartViewWidth} ${chartViewHeight}`} aria-label="Chart visualization" role="img">
                ${showGrid ? this.renderGrid(left, top, width, height, min, max, ticks) : nothing}
                ${this.renderTooltipCursor(left, top, width, height, this.payload.type)}
                ${
                  this.payload.type === "bar"
                    ? this.payload.series.map((series, index) => {
                        return this.renderBarSeries(series, colors[index], index, left, top, width, height, min, max);
                      })
                    : this.payload.series.map((series, index) => {
                        return this.renderLineSeries(series, colors[index], index, left, top, width, height, min, max);
                      })
                }
                ${this.renderXAxisLabels(left, width, top + height, this.payload.type)}
              </svg>
              ${this.renderTooltip(chartViewWidth, chartViewHeight, colors)}
              ${
                showLegend
                  ? html`
                    <ul class="legend">
                      ${this.payload.series.map((series, index) => {
                        return html`<li class="legend-item"><span class="legend-swatch" style=${`background: ${colors[index]}`}></span>${series.label}</li>`;
                      })}
                    </ul>
                  `
                  : nothing
              }
            </div>
          </div>
        </div>
      </article>
    `;
  }
}
