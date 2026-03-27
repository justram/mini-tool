import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { sanitizeHref } from "../../shared/media.js";
import stylesText from "./image.css?inline";
import type { SerializableImage } from "./schema.js";

const FALLBACK_LOCALE = "en-US";

@customElement("mini-tool-image")
export class MiniToolImage extends LitElement {
  @property({ attribute: false })
  payload!: SerializableImage;

  static styles = unsafeCSS(stylesText);

  private emitNavigate(href: string, origin: "image" | "source"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:navigate", {
        detail: {
          href,
          origin,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private activateImage(): void {
    const href = sanitizeHref(this.payload?.href);
    if (!href) {
      return;
    }

    this.emitNavigate(href, "image");
  }

  private onImageKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.activateImage();
  }

  private activateSource(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const resolved =
      sanitizeHref(this.payload?.source?.url) ?? sanitizeHref(this.payload?.href) ?? sanitizeHref(this.payload?.src);

    if (!resolved) {
      return;
    }

    this.emitNavigate(resolved, "source");
  }

  private ratioStyle(ratio: SerializableImage["ratio"]): string {
    switch (ratio) {
      case "1:1":
        return "aspect-ratio: 1 / 1;";
      case "4:3":
        return "aspect-ratio: 4 / 3;";
      case "16:9":
        return "aspect-ratio: 16 / 9;";
      case "9:16":
        return "aspect-ratio: 9 / 16;";
      default:
        return "min-height: 10rem;";
    }
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const locale = this.payload.locale ?? FALLBACK_LOCALE;
    const safeHref = sanitizeHref(this.payload.href);
    const sourceHref = sanitizeHref(this.payload.source?.url);
    const sourceLabel = this.payload.source?.label ?? this.payload.domain;
    const fallbackInitial = (sourceLabel ?? "").trim().charAt(0).toUpperCase();
    const hasSource = Boolean(sourceLabel || this.payload.source?.iconUrl);
    const hasMetadata = Boolean(this.payload.title || hasSource);
    const fitClass = this.payload.fit === "contain" ? "fit-contain" : "fit-cover";

    return html`
      <article data-mini-tool-id=${this.payload.id} data-slot="image" lang=${locale}>
        <div
          class=${`media ${safeHref ? "clickable" : ""}`}
          style=${this.ratioStyle(this.payload.ratio)}
          role=${safeHref ? "link" : nothing}
          tabindex=${safeHref ? "0" : nothing}
          @click=${safeHref ? this.activateImage : nothing}
          @keydown=${safeHref ? this.onImageKeyDown : nothing}
        >
          <img
            class=${`image ${fitClass}`}
            src=${this.payload.src}
            alt=${this.payload.alt}
            loading="lazy"
            decoding="async"
          />
        </div>

        ${
          hasMetadata
            ? html`
              <div class="metadata">
                ${
                  sourceHref && hasSource
                    ? html`
                      <button class="source clickable" type="button" @click=${this.activateSource}>
                        ${
                          this.payload.source?.iconUrl
                            ? html`<img
                              class="source-icon"
                              src=${this.payload.source.iconUrl}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              decoding="async"
                            />`
                            : fallbackInitial
                              ? html`<div class="source-fallback">${fallbackInitial}</div>`
                              : nothing
                        }
                        <div class="text">
                          ${this.payload.title ? html`<p class="title">${this.payload.title}</p>` : nothing}
                          ${sourceLabel ? html`<p class="source-label">${sourceLabel}</p>` : nothing}
                        </div>
                      </button>
                    `
                    : html`
                      <div class="source">
                        ${
                          this.payload.source?.iconUrl
                            ? html`<img
                              class="source-icon"
                              src=${this.payload.source.iconUrl}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              decoding="async"
                            />`
                            : fallbackInitial
                              ? html`<div class="source-fallback">${fallbackInitial}</div>`
                              : nothing
                        }
                        <div class="text">
                          ${this.payload.title ? html`<p class="title">${this.payload.title}</p>` : nothing}
                          ${sourceLabel ? html`<p class="source-label">${sourceLabel}</p>` : nothing}
                        </div>
                      </div>
                    `
                }
              </div>
            `
            : nothing
        }
      </article>
    `;
  }
}
