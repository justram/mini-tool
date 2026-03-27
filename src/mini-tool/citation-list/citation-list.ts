import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sanitizeHref } from "../../shared/media.js";
import type { SerializableCitation } from "../citation/schema.js";
import stylesText from "./citation-list.css?inline";
import type { SerializableCitationList } from "./schema.js";

@customElement("mini-tool-citation-list")
export class MiniToolCitationList extends LitElement {
  @property({ attribute: false })
  payload!: SerializableCitationList;

  @state()
  private expanded = false;

  static styles = unsafeCSS(stylesText);

  private emitNavigate(citation: SerializableCitation): void {
    const href = sanitizeHref(citation.href);
    if (!href) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("mini-tool:navigate", {
        detail: {
          href,
          payload: citation,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleExpanded = (): void => {
    this.expanded = !this.expanded;
  };

  private renderAvatar(citation: SerializableCitation) {
    if (citation.favicon) {
      return html`<span class="avatar"
        ><img src=${citation.favicon} alt="" aria-hidden="true" loading="lazy" decoding="async"
      /></span>`;
    }

    const fallback = (citation.domain ?? citation.title).trim().charAt(0).toUpperCase() || "•";
    return html`<span class="avatar"><span class="avatar-fallback">${fallback}</span></span>`;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const citations = this.payload.citations;
    if (citations.length === 0) {
      return nothing;
    }

    const variant = this.payload.variant ?? "default";

    if (variant === "stacked") {
      const visible = citations.slice(0, 4);
      const remainingCount = Math.max(0, citations.length - 4);

      return html`
        <div class="root" data-slot="citation-list" data-mini-tool-id=${this.payload.id}>
          <button
            class="stacked-trigger"
            type="button"
            aria-expanded=${String(this.expanded)}
            aria-label=${`${citations.length} sources`}
            @click=${this.toggleExpanded}
          >
            <span class="avatar-stack">
              ${visible.map((citation) => this.renderAvatar(citation))}
              ${
                remainingCount > 0
                  ? html`
                      <span class="avatar"><span class="avatar-fallback">•••</span></span>
                    `
                  : nothing
              }
            </span>
            <span class="sources-count">${citations.length} sources</span>
          </button>

          ${
            this.expanded
              ? html`
                <div class="list" role="list" aria-label="Citation sources">
                  ${citations.map(
                    (citation) => html`
                      <button class="item" type="button" @click=${() => this.emitNavigate(citation)}>
                        <span class="item-title">${citation.title}</span>
                        <span class="item-domain">${citation.domain ?? citation.href}</span>
                      </button>
                    `,
                  )}
                </div>
              `
              : nothing
          }
        </div>
      `;
    }

    const shouldTruncate = this.payload.maxVisible !== undefined && citations.length > this.payload.maxVisible;
    const visible = shouldTruncate ? citations.slice(0, this.payload.maxVisible) : citations;
    const overflow = shouldTruncate ? citations.length - visible.length : 0;

    return html`
      <div class="root" data-slot="citation-list" data-mini-tool-id=${this.payload.id}>
        <div class="list" role="list" aria-label="Citation sources">
          ${visible.map(
            (citation) => html`
              <button class="item" type="button" @click=${() => this.emitNavigate(citation)}>
                <span class="item-title">${citation.title}</span>
                <span class="item-domain">${citation.domain ?? citation.href}</span>
              </button>
            `,
          )}
          ${
            overflow > 0
              ? html`<div class="item-domain" style="padding: 0.4rem 0.625rem;">+${overflow} more</div>`
              : nothing
          }
        </div>
      </div>
    `;
  }
}
