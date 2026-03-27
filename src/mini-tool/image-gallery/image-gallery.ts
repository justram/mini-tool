import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ImageOff, X } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import { sanitizeHref } from "../../shared/media.js";
import stylesText from "./image-gallery.css?inline";
import type { ImageGalleryItem, SerializableImageGallery } from "./schema.js";

@customElement("mini-tool-image-gallery")
export class MiniToolImageGallery extends LitElement {
  @property({ attribute: false })
  payload!: SerializableImageGallery;

  private readonly handleWindowKeyDown = (event: KeyboardEvent): void => {
    if (this.activeIndex === null) {
      return;
    }

    this.onLightboxKeyDown(event);
  };

  @state()
  private activeIndex: number | null = null;

  @state()
  private imageErrors = new Set<string>();

  static styles = unsafeCSS(stylesText);

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleWindowKeyDown);
  }

  disconnectedCallback(): void {
    window.removeEventListener("keydown", this.handleWindowKeyDown);
    super.disconnectedCallback();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (!changed.has("activeIndex") || this.activeIndex === null) {
      return;
    }

    const closeButton = this.shadowRoot?.querySelector<HTMLButtonElement>(".close-button");
    closeButton?.focus();
  }

  private get activeImage(): ImageGalleryItem | null {
    if (!this.payload || this.activeIndex === null) {
      return null;
    }

    return this.payload.images[this.activeIndex] ?? null;
  }

  private isPortraitImage(image: ImageGalleryItem): boolean {
    const ratio = image.width / image.height;
    return ratio < 0.9;
  }

  private onThumbnailError(imageId: string): void {
    if (this.imageErrors.has(imageId)) {
      return;
    }

    this.imageErrors = new Set(this.imageErrors).add(imageId);
  }

  private onThumbnailKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    this.openLightbox(index);
  }

  private openLightbox(index: number): void {
    const image = this.payload?.images[index];
    if (!image) {
      return;
    }

    this.activeIndex = index;
    this.dispatchEvent(
      new CustomEvent("mini-tool:image-gallery-click", {
        detail: {
          imageId: image.id,
          image,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private closeLightbox(): void {
    this.activeIndex = null;
  }

  private openSourceLink(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const href = sanitizeHref(this.activeImage?.source?.url);
    if (!href) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("mini-tool:navigate", {
        detail: {
          href,
          origin: "image-gallery-source",
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private goToPrevious(): void {
    if (!this.payload || this.activeIndex === null) {
      return;
    }

    this.activeIndex = (this.activeIndex - 1 + this.payload.images.length) % this.payload.images.length;
  }

  private goToNext(): void {
    if (!this.payload || this.activeIndex === null) {
      return;
    }

    this.activeIndex = (this.activeIndex + 1) % this.payload.images.length;
  }

  private onLightboxKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.goToPrevious();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.goToNext();
    }
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const hasHeader = Boolean(this.payload.title || this.payload.description);
    const activeImage = this.activeImage;

    return html`
      <article class="root" data-mini-tool-id=${this.payload.id} data-slot="image-gallery">
        ${
          hasHeader
            ? html`
              <header class="header">
                ${this.payload.title ? html`<h3 class="title">${this.payload.title}</h3>` : nothing}
                ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
              </header>
            `
            : nothing
        }

        <div class="grid-wrap">
          <div class="grid" role="list">
            ${this.payload.images.map((image, index) => {
              const hasError = this.imageErrors.has(image.id);
              const portrait = this.isPortraitImage(image);
              const tileAspect = portrait ? nothing : "aspect-ratio: 1 / 1;";

              return html`
                <div class=${`tile${portrait ? " tile-portrait" : ""}`} role="listitem" style=${tileAspect}>
                  <button
                    type="button"
                    class="tile-button"
                    aria-label=${image.alt}
                    @click=${() => this.openLightbox(index)}
                    @keydown=${(event: KeyboardEvent) => this.onThumbnailKeyDown(event, index)}
                  ></button>

                  <div class="tile-media" aria-hidden="true">
                    ${
                      hasError
                        ? html`
                          <div class="tile-error">
                            ${renderLucideIcon(ImageOff, { className: "tile-error-icon", size: 20 })}
                            <span>${image.alt}</span>
                          </div>
                        `
                        : html`
                          <img
                            class="tile-image"
                            src=${image.src}
                            alt=${image.alt}
                            width=${image.width}
                            height=${image.height}
                            loading="lazy"
                            decoding="async"
                            draggable="false"
                            @error=${() => this.onThumbnailError(image.id)}
                          />
                        `
                    }
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        ${
          activeImage
            ? html`
              <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image lightbox" @keydown=${this.onLightboxKeyDown}>
                <button class="lightbox-backdrop" type="button" aria-label="Close lightbox" @click=${this.closeLightbox}></button>
                <div class="lightbox-content">
                  <button class="icon-button close-button" type="button" aria-label="Close" @click=${this.closeLightbox}>
                    ${renderLucideIcon(X, { className: "icon", size: 18 })}
                  </button>
                  <img
                    class="lightbox-image"
                    src=${activeImage.src}
                    alt=${activeImage.alt}
                    width=${activeImage.width}
                    height=${activeImage.height}
                    draggable="false"
                  />

                  ${
                    activeImage.title || activeImage.caption || activeImage.source?.label
                      ? html`
                        <div class="metadata">
                          ${activeImage.title ? html`<h3 class="metadata-title">${activeImage.title}</h3>` : nothing}
                          ${
                            activeImage.caption || activeImage.source?.label
                              ? html`
                                <p class="metadata-caption">
                                  ${activeImage.caption ?? ""}
                                  ${activeImage.caption && activeImage.source?.label ? " · " : ""}
                                  ${
                                    activeImage.source?.label
                                      ? sanitizeHref(activeImage.source.url)
                                        ? html`<button class="source-link" type="button" @click=${this.openSourceLink}>
                                            ${activeImage.source.label}
                                          </button>`
                                        : html`${activeImage.source.label}`
                                      : nothing
                                  }
                                </p>
                              `
                              : nothing
                          }
                        </div>
                      `
                      : nothing
                  }
                </div>
              </div>
            `
            : nothing
        }
      </article>
    `;
  }
}
