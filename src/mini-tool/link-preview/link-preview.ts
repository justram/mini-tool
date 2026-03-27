import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { sanitizeHref } from "../../shared/media.js";
import stylesText from "./link-preview.css?inline";
import type { SerializableLinkPreview } from "./schema.js";

const FALLBACK_LOCALE = "en-US";

@customElement("mini-tool-link-preview")
export class MiniToolLinkPreview extends LitElement {
  @property({ attribute: false })
  payload!: SerializableLinkPreview;

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

  private onCardActivate(): void {
    const safeHref = sanitizeHref(this.payload?.href);
    if (!safeHref) {
      return;
    }

    this.emitNavigate(safeHref);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onCardActivate();
    }
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const safeHref = sanitizeHref(this.payload.href);
    const locale = this.payload.locale ?? FALLBACK_LOCALE;

    return html`
      <article
        data-mini-tool-id=${this.payload.id}
        data-slot="link-preview"
        lang=${locale}
        class=${safeHref ? "clickable" : ""}
        role=${safeHref ? "link" : nothing}
        tabindex=${safeHref ? "0" : nothing}
        @click=${safeHref ? this.onCardActivate : nothing}
        @keydown=${safeHref ? this.onKeyDown : nothing}
      >
        ${
          this.payload.image
            ? html`<img class="image" src=${this.payload.image} alt="" loading="lazy" decoding="async" />`
            : nothing
        }
        <div class="content">
          ${
            this.payload.domain
              ? html`<div class="domain-row">
                ${
                  this.payload.favicon
                    ? html`<img class="favicon" src=${this.payload.favicon} alt="" aria-hidden="true" />`
                    : nothing
                }
                <span>${this.payload.domain}</span>
              </div>`
              : nothing
          }
          ${this.payload.title ? html`<h3 class="title">${this.payload.title}</h3>` : nothing}
          ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
        </div>
      </article>
    `;
  }
}
