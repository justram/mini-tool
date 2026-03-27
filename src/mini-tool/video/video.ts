import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { Link2 } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import { sanitizeHref } from "../../shared/media.js";
import type { SerializableVideo } from "./schema.js";
import stylesText from "./video.css?inline";

const FALLBACK_LOCALE = "en-US";

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCreatedAt(createdAt: string, locale: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

@customElement("mini-tool-video")
export class MiniToolVideo extends LitElement {
  @property({ attribute: false })
  payload!: SerializableVideo;

  @property({ type: Boolean })
  autoPlay = true;

  @property({ type: Boolean })
  defaultMuted = true;

  @state()
  private muted = true;

  @query("video")
  private videoElement?: HTMLVideoElement;

  static styles = unsafeCSS(stylesText);

  connectedCallback(): void {
    super.connectedCallback();
    this.muted = this.defaultMuted;
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("defaultMuted")) {
      this.muted = this.defaultMuted;
    }

    if (!changed.has("payload")) {
      return;
    }

    this.muted = this.defaultMuted;
    const video = this.videoElement;
    if (!video) {
      return;
    }

    video.currentTime = 0;
    video.pause();
    video.muted = this.defaultMuted;
  }

  private emitNavigate(href: string, origin: "open"): boolean {
    return this.dispatchEvent(
      new CustomEvent("mini-tool:navigate", {
        detail: {
          href,
          origin,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
  }

  private emitMediaEvent(type: "play" | "pause" | "mute" | "unmute"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:video-media-event", {
        detail: {
          type,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private openSafeNavigationHref(href: string): void {
    if (
      href.startsWith("/") ||
      href.startsWith("./") ||
      href.startsWith("../") ||
      href.startsWith("?") ||
      href.startsWith("#")
    ) {
      window.location.assign(href);
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  }

  private onOpen(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const href = sanitizeHref(this.payload?.href) ?? sanitizeHref(this.payload?.source?.url);
    if (!href) {
      return;
    }

    const shouldContinueWithDefaultNavigation = this.emitNavigate(href, "open");
    if (shouldContinueWithDefaultNavigation) {
      this.openSafeNavigationHref(href);
    }
  }

  private onVolumeChange(event: Event): void {
    const target = event.currentTarget as HTMLVideoElement;
    const nextMuted = target.muted;
    if (nextMuted === this.muted) {
      return;
    }

    this.muted = nextMuted;
    this.emitMediaEvent(nextMuted ? "mute" : "unmute");
  }

  private ratioStyle(ratio: SerializableVideo["ratio"]): string {
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

  private renderOpenLinkIcon() {
    return renderLucideIcon(Link2, { className: "open-link-icon", size: 16 });
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const locale = this.payload.locale ?? FALLBACK_LOCALE;
    const safeHref = sanitizeHref(this.payload.href) ?? sanitizeHref(this.payload.source?.url);
    const sourceLabel = this.payload.source?.label;
    const metadataDomain = this.payload.domain && this.payload.domain !== sourceLabel ? this.payload.domain : undefined;
    const hasOverlay = Boolean(this.payload.title || safeHref);
    const hasMetadata = Boolean(
      this.payload.description || sourceLabel || metadataDomain || this.payload.durationMs || this.payload.createdAt,
    );
    const fitClass = this.payload.fit === "contain" ? "fit-contain" : "fit-cover";

    return html`
      <article data-mini-tool-id=${this.payload.id} data-slot="video" lang=${locale}>
        <div class="media" style=${this.ratioStyle(this.payload.ratio ?? "16:9")}>
          <video
            class=${`video ${fitClass}`}
            src=${this.payload.src}
            poster=${this.payload.poster ?? nothing}
            controls
            playsinline
            preload="metadata"
            ?autoplay=${this.autoPlay}
            ?muted=${this.muted}
            @play=${() => this.emitMediaEvent("play")}
            @pause=${() => this.emitMediaEvent("pause")}
            @volumechange=${this.onVolumeChange}
          ></video>

          ${
            hasOverlay
              ? html`
                <div class="overlay-gradient" aria-hidden="true"></div>
                <div class="overlay">
                  ${
                    this.payload.title
                      ? html`<p class="title">${this.payload.title}</p>`
                      : html`
                          <span></span>
                        `
                  }
                </div>
              `
              : nothing
          }
        </div>

        ${
          hasMetadata
            ? html`
              <div class="metadata">
                ${
                  this.payload.description || safeHref
                    ? html`
                        <div class="summary-row">
                          ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
                          ${
                            safeHref
                              ? html`<button class="open-link" type="button" @click=${this.onOpen} aria-label="Open source link">
                                  ${this.renderOpenLinkIcon()}
                                </button>`
                              : nothing
                          }
                        </div>
                      `
                    : nothing
                }
                <div class="meta-row">
                  ${sourceLabel ? html`<span>${sourceLabel}</span>` : nothing}
                  ${metadataDomain ? html`<span>${metadataDomain}</span>` : nothing}
                  ${typeof this.payload.durationMs === "number" ? html`<span>${formatDuration(this.payload.durationMs)}</span>` : nothing}
                  ${
                    this.payload.createdAt
                      ? html`<time dateTime=${this.payload.createdAt}>${formatCreatedAt(this.payload.createdAt, locale)}</time>`
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
