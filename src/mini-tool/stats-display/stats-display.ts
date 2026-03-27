import { html, LitElement, nothing, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SerializableStatsDisplay, StatDiff, StatFormat, StatItem } from "./schema.js";
import { Sparkline, sparklineStyles } from "./sparkline.js";
import stylesText from "./stats-display.css?inline";

function renderFormattedValue(value: string | number, format: StatFormat | undefined, locale: string): TemplateResult {
  if (typeof value === "string" || !format) {
    return html`<span class="value-primary">${String(value)}</span>`;
  }

  switch (format.kind) {
    case "number": {
      const decimals = format.decimals ?? 0;

      if (format.compact) {
        const parts = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          notation: "compact",
        }).formatToParts(value);
        const fullNumber = new Intl.NumberFormat(locale).format(value);

        return html`
          <span class="value-primary" aria-label=${fullNumber}>
            ${parts.map((part) =>
              part.type === "compact"
                ? html`<span class="value-suffix" aria-hidden="true">${part.value}</span>`
                : html`<span>${part.value}</span>`,
            )}
          </span>
        `;
      }

      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

      return html`<span class="value-primary">${formatted}</span>`;
    }
    case "currency": {
      const decimals = format.decimals ?? 2;
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: format.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
      const spokenValue = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: format.currency,
        currencyDisplay: "name",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

      return html`<span class="value-primary" aria-label=${spokenValue}>${formatted}</span>`;
    }
    case "percent": {
      const decimals = format.decimals ?? 2;
      const basis = format.basis ?? "fraction";
      const numeric = basis === "fraction" ? value * 100 : value;
      const formatted = numeric.toFixed(decimals);

      return html`
        <span class="value-primary" aria-label=${`${formatted} percent`}>
          ${formatted}<span class="value-suffix" aria-hidden="true">%</span>
        </span>
      `;
    }
    default:
      return html`<span class="value-primary">${String(value)}</span>`;
  }
}

function renderDiff(diff: StatDiff): TemplateResult {
  const { value, decimals = 1, upIsPositive = true, label } = diff;
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isGood = upIsPositive ? isPositive : isNegative;
  const isBad = upIsPositive ? isNegative : isPositive;
  const toneClass = isGood ? "diff-positive" : isBad ? "diff-negative" : "diff-neutral";
  const formatted = Math.abs(value).toFixed(decimals);
  const sign = isNegative ? "−" : "+";

  return html`
    <span class=${`diff ${toneClass}`}>
      ${!upIsPositive ? html`<span class="diff-arrow">${isGood ? "↓" : "↑"}</span>` : nothing}
      <span class="diff-value">${`${sign}${formatted}%`}</span>
      ${label ? html`<span class="diff-label">${label}</span>` : nothing}
    </span>
  `;
}

@customElement("mini-tool-stats-display")
export class MiniToolStatsDisplay extends LitElement {
  @property({ attribute: false })
  payload!: SerializableStatsDisplay;

  static styles = [unsafeCSS(stylesText), sparklineStyles];

  private renderStat(stat: StatItem, index: number, isSingle: boolean, locale: string) {
    const sparklineColor = stat.sparkline?.color ?? "var(--muted-foreground)";
    const baseDelay = index * 175;

    return html`
      <div class="stat-cell">
        <div class=${`stat-card ${isSingle ? "single" : ""}`}>
          ${
            stat.sparkline
              ? html`
                <div class="sparkline-wrap" aria-hidden="true">
                  ${Sparkline({
                    id: `${this.payload.id}-${stat.key}`,
                    data: stat.sparkline.data,
                    color: sparklineColor,
                    showFill: true,
                    fillOpacity: 0.09,
                    animationDelayMs: baseDelay,
                  })}
                </div>
              `
              : nothing
          }
          <span class="stat-label" style=${`--stat-label-delay: ${baseDelay + 75}ms`}>${stat.label}</span>
          <div class="value-row" style=${`--value-row-delay: ${baseDelay + 150}ms`}>
            <span class=${`stat-value ${isSingle ? "single" : ""}`}>
              ${renderFormattedValue(stat.value, stat.format, locale)}
            </span>
            ${stat.diff ? renderDiff(stat.diff) : nothing}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
    const hasHeader = Boolean(this.payload.title || this.payload.description);
    const isSingle = this.payload.stats.length === 1;

    return html`
      <article data-slot="stats-display" data-mini-tool-id=${this.payload.id} class=${`container ${isSingle ? "single" : ""}`}>
        <div class="card">
          ${
            hasHeader
              ? html`
                <header class="header">
                  ${this.payload.title ? html`<h2 class="title">${this.payload.title}</h2>` : nothing}
                  ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
                </header>
              `
              : nothing
          }
          <div class="stats-grid">
            ${this.payload.stats.map((stat, index) => this.renderStat(stat, index, isSingle, locale))}
          </div>
        </div>
      </article>
    `;
  }
}
