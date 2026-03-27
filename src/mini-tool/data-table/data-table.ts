import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./data-table.css?inline";
import { renderFormattedValue } from "./formatters.js";
import { parseSerializableDataTable, type SerializableDataTable, type SerializableDataTableColumn } from "./schema.js";
import { createDataTableRowKeys, sortData } from "./utilities.js";

const DEFAULT_LOCALE = "en-US";

type SortDirection = "asc" | "desc";

type CategorizedColumns = {
  primary: SerializableDataTableColumn[];
  secondary: SerializableDataTableColumn[];
};

function categorizeColumns(columns: SerializableDataTableColumn[]): CategorizedColumns {
  const primary: SerializableDataTableColumn[] = [];
  const secondary: SerializableDataTableColumn[] = [];

  let visibleCount = 0;
  for (const column of columns) {
    if (column.hideOnMobile) {
      continue;
    }

    if (column.priority === "primary") {
      primary.push(column);
      continue;
    }

    if (column.priority === "secondary") {
      secondary.push(column);
      continue;
    }

    if (column.priority === "tertiary") {
      continue;
    }

    if (visibleCount < 2) {
      primary.push(column);
    } else {
      secondary.push(column);
    }

    visibleCount += 1;
  }

  return { primary, secondary };
}

function sanitizeRowId(rowKey: string): string {
  return encodeURIComponent(rowKey).replace(/%/g, "_");
}

function normalizeSort(sort?: { by?: string; direction?: SortDirection }): { by?: string; direction?: SortDirection } {
  if (!sort?.by || !sort.direction) {
    return {};
  }

  return { by: sort.by, direction: sort.direction };
}

@customElement("mini-tool-data-table")
export class MiniToolDataTable extends LitElement {
  @property({ attribute: false })
  payload!: SerializableDataTable;

  @state()
  private sortBy: string | undefined;

  @state()
  private sortDirection: SortDirection | undefined;

  static styles = unsafeCSS(stylesText);

  protected updated(changed: Map<string, unknown>): void {
    if (!changed.has("payload")) {
      return;
    }

    if (!this.payload) {
      this.sortBy = undefined;
      this.sortDirection = undefined;
      return;
    }

    const parsed = parseSerializableDataTable(this.payload);
    const initialSort = normalizeSort(parsed.sort ?? parsed.defaultSort);
    this.sortBy = initialSort.by;
    this.sortDirection = initialSort.direction;
  }

  private get effectivePayload(): SerializableDataTable | null {
    if (!this.payload) {
      return null;
    }

    return parseSerializableDataTable(this.payload);
  }

  private get effectiveLocale(): string {
    return this.effectivePayload?.locale ?? DEFAULT_LOCALE;
  }

  private get sortedRows() {
    const payload = this.effectivePayload;
    if (!payload) {
      return [];
    }

    if (!this.sortBy || !this.sortDirection) {
      return payload.data;
    }

    return sortData(payload.data, this.sortBy, this.sortDirection, this.effectiveLocale);
  }

  private toggleSort(column: SerializableDataTableColumn): void {
    if (column.sortable === false) {
      return;
    }

    let nextDirection: SortDirection | undefined;
    let nextBy: string | undefined;

    if (this.sortBy !== column.key) {
      nextBy = column.key;
      nextDirection = "asc";
    } else if (this.sortDirection === "asc") {
      nextBy = column.key;
      nextDirection = "desc";
    } else if (this.sortDirection === "desc") {
      nextBy = undefined;
      nextDirection = undefined;
    } else {
      nextBy = column.key;
      nextDirection = "asc";
    }

    this.sortBy = nextBy;
    this.sortDirection = nextDirection;

    this.dispatchEvent(
      new CustomEvent("mini-tool:data-table-sort-change", {
        detail: {
          by: nextBy,
          direction: nextDirection,
          payload: this.effectivePayload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderDesktopTable(payload: SerializableDataTable) {
    const rows = this.sortedRows;
    const rowKeys = createDataTableRowKeys(rows, payload.rowIdKey);

    return html`
      <div class="table-wrap" style=${payload.maxHeight ? `--max-height:${payload.maxHeight};` : nothing}>
        <table class="table" role="table">
          <colgroup>
            ${payload.columns.map((column) => {
              return html`<col style=${column.width ? `width:${column.width};` : nothing} />`;
            })}
          </colgroup>
          <thead>
            <tr>
              ${payload.columns.map((column) => {
                const sortable = column.sortable !== false;
                const isSorted = this.sortBy === column.key;
                const direction = isSorted ? this.sortDirection : undefined;
                const indicator = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "⇅";
                const alignClass = column.align ? `align-${column.align}` : nothing;

                return html`
                  <th class=${alignClass} aria-sort=${isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      class="column-button"
                      ?disabled=${!sortable}
                      @click=${() => this.toggleSort(column)}
                      aria-label=${`Sort by ${column.label}`}
                    >
                      <span class="header-label">${column.abbr ?? column.label}</span>
                      ${
                        sortable
                          ? html`<span class=${`sort-indicator ${direction ?? "none"}`}>${indicator}</span>`
                          : nothing
                      }
                    </button>
                  </th>
                `;
              })}
            </tr>
          </thead>
          <tbody>
            ${
              rows.length === 0
                ? html`
                  <tr>
                    <td class="empty" colspan=${String(Math.max(payload.columns.length, 1))}>${
                      payload.emptyMessage ?? "No data available"
                    }</td>
                  </tr>
                `
                : rows.map((row, index) => {
                    return html`<tr data-row-key=${rowKeys[index]}>
                    ${payload.columns.map((column, columnIndex) => {
                      const alignClass =
                        column.align ??
                        (columnIndex === 0
                          ? "left"
                          : typeof row[column.key] === "number" ||
                              column.format?.kind === "number" ||
                              column.format?.kind === "currency" ||
                              column.format?.kind === "percent" ||
                              column.format?.kind === "delta"
                            ? "right"
                            : "left");

                      return html`<td class=${`cell align-${alignClass} ${column.truncate ? "truncate" : ""}`}>
                        ${renderFormattedValue(row[column.key], column, row, this.effectiveLocale)}
                      </td>`;
                    })}
                  </tr>`;
                  })
            }
          </tbody>
        </table>
      </div>
    `;
  }

  private renderMobileCards(payload: SerializableDataTable) {
    const rows = this.sortedRows;
    const rowKeys = createDataTableRowKeys(rows, payload.rowIdKey);
    const { primary, secondary } = categorizeColumns(payload.columns);

    if (rows.length === 0) {
      return html`<div class="mobile-empty">${payload.emptyMessage ?? "No data available"}</div>`;
    }

    return html`
      <div class="mobile-list" role="list" aria-label="Data table mobile cards">
        ${rows.map((row, index) => {
          const primaryColumn = primary[0];
          const remainingPrimary = primary.slice(1);
          const rowId = sanitizeRowId(rowKeys[index]);
          const rowLabel = primaryColumn ? String(row[primaryColumn.key] ?? "") : `Row ${index + 1}`;

          if (secondary.length === 0) {
            return html`
              <article class="mobile-card simple" role="listitem" aria-label=${rowLabel}>
                ${
                  primaryColumn
                    ? html`<div class="mobile-heading">${renderFormattedValue(
                        row[primaryColumn.key],
                        primaryColumn,
                        row,
                        this.effectiveLocale,
                      )}</div>`
                    : nothing
                }
                ${remainingPrimary.map((column) => {
                  return html`
                    <div class="mobile-row">
                      <dt>${column.label}</dt>
                      <dd>${renderFormattedValue(row[column.key], column, row, this.effectiveLocale)}</dd>
                    </div>
                  `;
                })}
              </article>
            `;
          }

          return html`
            <details class="mobile-card" role="listitem">
              <summary aria-controls=${`row-${rowId}-details`}>
                <div class="mobile-heading">${
                  primaryColumn
                    ? renderFormattedValue(row[primaryColumn.key], primaryColumn, row, this.effectiveLocale)
                    : `Row ${index + 1}`
                }</div>
                ${
                  remainingPrimary.length > 0
                    ? html`<div class="mobile-summary">
                      ${remainingPrimary.map((column) => {
                        return html`<span>
                          <strong>${column.label}:</strong>
                          ${renderFormattedValue(row[column.key], column, row, this.effectiveLocale)}
                        </span>`;
                      })}
                    </div>`
                    : nothing
                }
              </summary>
              <dl class="mobile-details" id=${`row-${rowId}-details`}>
                ${secondary.map((column) => {
                  return html`
                    <div class="mobile-row">
                      <dt>${column.label}</dt>
                      <dd>${renderFormattedValue(row[column.key], column, row, this.effectiveLocale)}</dd>
                    </div>
                  `;
                })}
              </dl>
            </details>
          `;
        })}
      </div>
    `;
  }

  render() {
    const payload = this.effectivePayload;
    if (!payload) {
      return nothing;
    }

    return html`
      <article class="root" data-mini-tool-id=${payload.id} data-slot="data-table">
        ${this.renderDesktopTable(payload)}
        ${this.renderMobileCards(payload)}
      </article>
    `;
  }
}
