import { html, nothing, type TemplateResult } from "lit";
import { sanitizeHref } from "../../shared/media.js";
import type { SerializableDataTableColumn, SerializableDataTableRow } from "./schema.js";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
type RowValue = SerializableDataTableRow[string];
type DisplayValue = string | number | TemplateResult;

function normalizeDecimals(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(20, Math.trunc(value)));
}

function getRelativeTime(date: Date, locale?: string): string {
  const now = new Date();
  const seconds = Math.trunc((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(seconds);

  if (absSeconds < 60) {
    return "just now";
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absSeconds < 3600) {
    return formatter.format(Math.trunc(seconds / 60), "minute");
  }
  if (absSeconds < 86400) {
    return formatter.format(Math.trunc(seconds / 3600), "hour");
  }
  if (absSeconds < 604800) {
    return formatter.format(Math.trunc(seconds / 86400), "day");
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function toneToClass(tone: Tone): string {
  if (tone === "success") {
    return "tone-success";
  }
  if (tone === "warning") {
    return "tone-warning";
  }
  if (tone === "danger") {
    return "tone-danger";
  }
  if (tone === "info") {
    return "tone-info";
  }

  return "tone-neutral";
}

export function NumberValue(
  value: number,
  options?: { decimals?: number; unit?: string; compact?: boolean; showSign?: boolean },
  locale?: string,
): DisplayValue {
  const decimals = normalizeDecimals(options?.decimals, 0);
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: options?.compact ? "compact" : "standard",
  }).format(value);

  const withSign = options?.showSign && value > 0 ? `+${formatted}` : formatted;
  return `${withSign}${options?.unit ?? ""}`;
}

export function CurrencyValue(
  value: number,
  options?: { currency?: string; decimals?: number },
  locale?: string,
): DisplayValue {
  const decimals = normalizeDecimals(options?.decimals, 2);
  const currency = options?.currency ?? "USD";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function PercentValue(
  value: number,
  options?: { decimals?: number; showSign?: boolean; basis?: "fraction" | "unit" },
  locale?: string,
): DisplayValue {
  const decimals = normalizeDecimals(options?.decimals, 2);
  const numeric = options?.basis === "unit" ? value / 100 : value;

  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: options?.showSign ? "always" : "auto",
  }).format(numeric);
}

export function DeltaValue(
  value: number,
  options?: { decimals?: number; upIsPositive?: boolean; showSign?: boolean },
  locale?: string,
): DisplayValue {
  const decimals = normalizeDecimals(options?.decimals, 2);
  const showSign = options?.showSign ?? true;
  const upIsPositive = options?.upIsPositive ?? true;

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;
  const good = upIsPositive ? isPositive : isNegative;
  const bad = upIsPositive ? isNegative : isPositive;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const display = showSign && !isNeutral ? (isNegative ? `-${formatted}` : `+${formatted}`) : formatted;
  const arrow = isPositive ? "↑" : isNegative ? "↓" : "";

  return html`<span class=${`delta ${good ? "delta-good" : bad ? "delta-bad" : "delta-neutral"}`}>
    ${display}${!isNeutral ? html`<span class="delta-arrow">${arrow}</span>` : nothing}
  </span>`;
}

export function DateValue(
  value: string,
  options?: { dateFormat?: "short" | "long" | "relative" },
  locale?: string,
): DisplayValue {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (options?.dateFormat === "relative") {
    return html`<span title=${date.toISOString()}>${getRelativeTime(date, locale)}</span>`;
  }

  if (options?.dateFormat === "long") {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function BooleanValue(value: boolean, options?: { labels?: { true: string; false: string } }): DisplayValue {
  const labels = options?.labels ?? { true: "Yes", false: "No" };
  return html`<span class=${`pill ${value ? "tone-info" : "tone-neutral"}`}>${value ? labels.true : labels.false}</span>`;
}

export function LinkValue(
  value: string,
  options?: { hrefKey?: string; external?: boolean },
  row?: SerializableDataTableRow,
): DisplayValue {
  const rawHref = options?.hrefKey && row ? String(row[options.hrefKey] ?? "") : value;
  const href = sanitizeHref(rawHref);

  if (!href) {
    return value;
  }

  return html`<a
    class="link"
    href=${href}
    target=${options?.external ? "_blank" : nothing}
    rel=${options?.external ? "noopener noreferrer" : nothing}
    @click=${(event: Event) => event.stopPropagation()}
  >
    ${value}${
      options?.external
        ? html`
            <span aria-hidden="true">↗</span>
          `
        : nothing
    }
  </a>`;
}

export function BadgeValue(value: string, options?: { colorMap?: Record<string, Tone> }): DisplayValue {
  const tone = options?.colorMap?.[value] ?? "neutral";
  return html`<span class=${`pill ${toneToClass(tone)}`}>${value}</span>`;
}

export function StatusBadge(
  value: string,
  options?: { statusMap?: Record<string, { tone: Tone; label?: string }> },
): DisplayValue {
  const status = options?.statusMap?.[value] ?? { tone: "neutral", label: value };
  return html`<span class=${`pill ${toneToClass(status.tone)}`}>${status.label ?? value}</span>`;
}

export function ArrayValue(value: RowValue, options?: { maxVisible?: number }): DisplayValue {
  const maxVisible = normalizeDecimals(options?.maxVisible, 3);
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",").map((entry) => entry.trim())
      : [];

  if (items.length === 0) {
    return html`
      <span class="muted">—</span>
    `;
  }

  const visible = items.slice(0, maxVisible);
  const hidden = items.slice(maxVisible);

  return html`<span class="array-list">
    ${visible.map((entry) => html`<span class="array-pill">${entry === null ? "null" : String(entry)}</span>`)}
    ${
      hidden.length > 0
        ? html`<span class="array-more" title=${hidden.map((entry) => (entry === null ? "null" : String(entry))).join(", ")}
          >+${hidden.length} more</span
        >`
        : nothing
    }
  </span>`;
}

export function renderFormattedValue(
  value: RowValue,
  column: SerializableDataTableColumn,
  row: SerializableDataTableRow,
  locale = "en-US",
): DisplayValue {
  if (value == null || value === "") {
    return html`
      <span class="muted">—</span>
    `;
  }

  const format = column.format;

  switch (format?.kind) {
    case "number":
      return NumberValue(Number(value), format, locale);
    case "currency":
      return CurrencyValue(Number(value), format, locale);
    case "percent":
      return PercentValue(Number(value), format, locale);
    case "delta":
      return DeltaValue(Number(value), format, locale);
    case "date":
      return DateValue(String(value), format, locale);
    case "status":
      return StatusBadge(String(value), format);
    case "boolean":
      return BooleanValue(Boolean(value), format);
    case "link":
      return LinkValue(String(value), format, row);
    case "badge":
      return BadgeValue(String(value), format);
    case "array":
      return ArrayValue(value, format);
    default:
      return String(value);
  }
}
