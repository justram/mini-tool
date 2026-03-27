import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { sanitizeHref } from "../../shared/media.js";
import stylesText from "./citation.css?inline";
import type { CitationType, CitationVariant, SerializableCitation } from "./schema.js";

const FALLBACK_LOCALE = "en-US";

function extractDomain(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function formatDate(isoString: string, locale: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(locale, { year: "numeric", month: "short" });
  } catch {
    return isoString;
  }
}

function iconForType(type: CitationType | undefined): string {
  switch (type) {
    case "document":
      return "📄";
    case "article":
      return "📰";
    case "api":
      return "🗄";
    case "code":
      return "</>";
    case "other":
      return "📁";
    default:
      return "🌐";
  }
}

@customElement("mini-tool-citation")
export class MiniToolCitation extends LitElement {
  @property({ attribute: false })
  payload!: SerializableCitation;

  @property({ type: String })
  variant: CitationVariant = "default";

  static styles = unsafeCSS(stylesText);

  private emitNavigate(href: string): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:navigate", {
        detail: {
          href,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private activate(): void {
    const href = sanitizeHref(this.payload?.href);
    if (!href) {
      return;
    }

    this.emitNavigate(href);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.activate();
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const safeHref = sanitizeHref(this.payload.href);
    const locale = this.payload.locale ?? FALLBACK_LOCALE;
    const domain = this.payload.domain ?? extractDomain(this.payload.href) ?? "";
    const typeIcon = iconForType(this.payload.type);

    if (this.variant === "inline") {
      return html`
        <button
          class="inline ${safeHref ? "clickable" : ""}"
          data-slot="citation"
          data-mini-tool-id=${this.payload.id}
          type="button"
          title=${this.payload.title}
          ?disabled=${!safeHref}
          @click=${this.activate}
        >
          ${
            this.payload.favicon
              ? html`<img class="favicon" src=${this.payload.favicon} alt="" aria-hidden="true" />`
              : html`<span class="type-icon" aria-hidden="true">${typeIcon}</span>`
          }
          <span>${domain}</span>
        </button>
      `;
    }

    return html`
      <article
        class="card ${safeHref ? "clickable" : ""}"
        data-slot="citation"
        data-mini-tool-id=${this.payload.id}
        lang=${locale}
        role=${safeHref ? "link" : nothing}
        tabindex=${safeHref ? "0" : nothing}
        @click=${safeHref ? this.activate : nothing}
        @keydown=${safeHref ? this.onKeyDown : nothing}
      >
        <div class="header">
          <div class="source">
            ${
              this.payload.favicon
                ? html`<img class="favicon" src=${this.payload.favicon} alt="" aria-hidden="true" />`
                : html`<span class="type-icon" aria-hidden="true">${typeIcon}</span>`
            }
            <span>${domain}</span>
            ${
              this.payload.author || this.payload.publishedAt
                ? html`<span>
                  — ${this.payload.author ?? ""}
                  ${this.payload.author && this.payload.publishedAt ? ", " : ""}
                  ${
                    this.payload.publishedAt
                      ? html`<time dateTime=${this.payload.publishedAt}
                        >${formatDate(this.payload.publishedAt, locale)}</time
                      >`
                      : nothing
                  }
                </span>`
                : nothing
            }
          </div>
          ${
            safeHref
              ? html`
                  <span aria-hidden="true">↗</span>
                `
              : nothing
          }
        </div>

        <h3 class="title">${this.payload.title}</h3>
        ${this.payload.snippet ? html`<p class="snippet">${this.payload.snippet}</p>` : nothing}
      </article>
    `;
  }
}
