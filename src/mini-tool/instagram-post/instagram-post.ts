import { html, LitElement, nothing, svg, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Heart, Share } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import stylesText from "./instagram-post.css?inline";
import type { InstagramPostMedia, SerializableInstagramPost } from "./schema.js";

let instanceCount = 0;

@customElement("mini-tool-instagram-post")
export class MiniToolInstagramPost extends LitElement {
  @property({ attribute: false })
  payload!: SerializableInstagramPost;

  private readonly iconGradientPrefix = `ig-${instanceCount++}`;

  static styles = unsafeCSS(stylesText);

  private formatRelativeTime(iso: string | undefined): string {
    if (!iso) {
      return "";
    }

    const timestamp = new Date(iso).getTime();
    if (Number.isNaN(timestamp)) {
      return "";
    }

    const seconds = Math.round((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    if (seconds < 3_600) {
      return `${Math.round(seconds / 60)}m`;
    }

    if (seconds < 86_400) {
      return `${Math.round(seconds / 3_600)}h`;
    }

    if (seconds < 604_800) {
      return `${Math.round(seconds / 86_400)}d`;
    }

    return `${Math.round(seconds / 604_800)}w`;
  }

  private formatCount(value: number | undefined): string {
    if (value === undefined) {
      return "";
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return String(value);
  }

  private dispatchAction(action: "like" | "share"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:instagram-post-action", {
        detail: {
          action,
          postId: this.payload.id,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderInstagramLogo(): TemplateResult {
    const primaryId = `${this.iconGradientPrefix}-primary`;
    const secondaryId = `${this.iconGradientPrefix}-secondary`;

    return svg`
      <svg class="logo" viewBox="0 0 132 132" role="img" aria-label="Instagram logo">
        <defs>
          <radialGradient
            id=${primaryId}
            cx="158.429"
            cy="578.088"
            r="65"
            gradientUnits="userSpaceOnUse"
            gradientTransform="matrix(0 -1.982 1.844 0 -1031.4 454)"
          >
            <stop offset="0" stop-color="#fd5"></stop>
            <stop offset=".1" stop-color="#fd5"></stop>
            <stop offset=".5" stop-color="#ff543e"></stop>
            <stop offset="1" stop-color="#c837ab"></stop>
          </radialGradient>
          <radialGradient
            id=${secondaryId}
            cx="147.694"
            cy="473.455"
            r="65"
            gradientUnits="userSpaceOnUse"
            gradientTransform="matrix(.174 .869 -3.58 .717 1648 -458.5)"
          >
            <stop offset="0" stop-color="#3771c8"></stop>
            <stop offset=".128" stop-color="#3771c8"></stop>
            <stop offset="1" stop-color="#60f" stop-opacity="0"></stop>
          </radialGradient>
        </defs>
        <path
          fill=${`url(#${primaryId})`}
          d="M65 0C37.9 0 30 .03 28.4.16c-5.6.46-9 1.34-12.8 3.22-2.9 1.44-5.2 3.12-7.5 5.47C4 13.1 1.5 18.4.6 24.66c-.44 3.04-.57 3.66-.6 19.2-.01 5.16 0 12 0 21.1 0 27.12.03 35.05.16 36.6.45 5.4 1.3 8.82 3.1 12.55 3.44 7.14 10 12.5 17.76 14.5 2.68.7 5.64 1.1 9.44 1.26 1.6.07 18 .12 34.44.12s32.84-.02 34.4-.1c4.4-.2 6.96-.55 9.8-1.28 7.78-2.01 14.23-7.3 17.74-14.53 1.76-3.64 2.66-7.18 3.07-12.32.08-1.12.12-18.97.12-36.8 0-17.85-.04-35.67-.13-36.8-.4-5.2-1.3-8.7-3.13-12.43-1.5-3.04-3.16-5.3-5.56-7.62C116.9 4 111.64 1.5 105.37.6 102.34.16 101.73.03 86.2 0H65z"
          transform="translate(1 1)"
        ></path>
        <path
          fill=${`url(#${secondaryId})`}
          d="M65 0C37.9 0 30 .03 28.4.16c-5.6.46-9 1.34-12.8 3.22-2.9 1.44-5.2 3.12-7.5 5.47C4 13.1 1.5 18.4.6 24.66c-.44 3.04-.57 3.66-.6 19.2-.01 5.16 0 12 0 21.1 0 27.12.03 35.05.16 36.6.45 5.4 1.3 8.82 3.1 12.55 3.44 7.14 10 12.5 17.76 14.5 2.68.7 5.64 1.1 9.44 1.26 1.6.07 18 .12 34.44.12s32.84-.02 34.4-.1c4.4-.2 6.96-.55 9.8-1.28 7.78-2.01 14.23-7.3 17.74-14.53 1.76-3.64 2.66-7.18 3.07-12.32.08-1.12.12-18.97.12-36.8 0-17.85-.04-35.67-.13-36.8-.4-5.2-1.3-8.7-3.13-12.43-1.5-3.04-3.16-5.3-5.56-7.62C116.9 4 111.64 1.5 105.37.6 102.34.16 101.73.03 86.2 0H65z"
          transform="translate(1 1)"
        ></path>
        <path
          fill="#fff"
          d="M66 18c-13 0-14.67.06-19.8.3-5.1.23-8.6 1.04-11.64 2.22-3.16 1.23-5.84 2.87-8.5 5.54-2.67 2.67-4.3 5.35-5.54 8.5-1.2 3.05-2 6.54-2.23 11.65C18.06 51.33 18 52.96 18 66s.06 14.67.3 19.78c.22 5.12 1.03 8.6 2.22 11.66 1.22 3.15 2.86 5.83 5.53 8.5 2.67 2.67 5.35 4.3 8.5 5.53 3.06 1.2 6.55 2 11.65 2.23 5.12.23 6.76.3 19.8.3 13 0 14.66-.07 19.78-.3 5.12-.23 8.6-1.03 11.66-2.23 3.15-1.23 5.83-2.87 8.5-5.53 2.67-2.67 4.3-5.35 5.53-8.5 1.2-3.06 2-6.54 2.23-11.66.23-5.1.3-6.75.3-19.78 0-13.04-.07-14.68-.3-19.8-.23-5.1-1.04-8.6-2.22-11.64-1.23-3.16-2.87-5.84-5.54-8.5-2.67-2.67-5.35-4.3-8.5-5.54-3.06-1.18-6.55-2-11.66-2.22-5.12-.24-6.75-.3-19.8-.3zm-4.3 8.65c1.28 0 2.7 0 4.3 0 12.82 0 14.34.05 19.4.28 4.67.2 7.22 1 8.9 1.65 2.25.87 3.84 1.9 5.52 3.6 1.68 1.67 2.72 3.27 3.6 5.5.65 1.7 1.43 4.24 1.64 8.92.23 5.05.28 6.57.28 19.4s-.05 14.32-.28 19.4c-.2 4.67-1 7.2-1.64 8.9-.88 2.25-1.92 3.84-3.6 5.52-1.68 1.68-3.27 2.72-5.52 3.6-1.7.65-4.23 1.43-8.9 1.64-5.06.23-6.58.28-19.4.28-12.82 0-14.34-.05-19.4-.28-4.68-.2-7.22-1-8.9-1.64-2.25-.88-3.84-1.92-5.52-3.6-1.68-1.68-2.72-3.27-3.6-5.52-.65-1.7-1.43-4.23-1.64-8.9-.23-5.06-.28-6.58-.28-19.4s.05-14.34.28-19.4c.2-4.68 1-7.22 1.64-8.9.88-2.24 1.92-3.83 3.6-5.52 1.68-1.68 3.27-2.72 5.52-3.6 1.7-.65 4.23-1.43 8.9-1.65 4.43-.2 6.15-.26 15.1-.27zm30 8c-3.2 0-5.77 2.57-5.77 5.75 0 3.2 2.58 5.77 5.77 5.77 3.18 0 5.76-2.58 5.76-5.77 0-3.18-2.58-5.76-5.76-5.76zm-25.63 6.72c-13.6 0-24.64 11.04-24.64 24.65 0 13.6 11.03 24.64 24.64 24.64 13.6 0 24.65-11.03 24.65-24.64 0-13.6-11.04-24.64-24.65-24.64zm0 8.65c8.84 0 16 7.16 16 16 0 8.84-7.16 16-16 16-8.84 0-16-7.16-16-16 0-8.84 7.16-16 16-16z"
        ></path>
      </svg>
    `;
  }

  private renderVerifiedBadge(): TemplateResult {
    return svg`<svg class="verified" viewBox="0 0 24 24" role="img" aria-label="Verified"><path fill="currentColor" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>`;
  }

  private renderHeartIcon(): TemplateResult {
    return renderLucideIcon(Heart, { className: "icon heart-icon", size: 16 });
  }

  private renderShareIcon(): TemplateResult {
    return renderLucideIcon(Share, { className: "icon share-icon", size: 16 });
  }

  private renderMediaItem(item: InstagramPostMedia, index: number, withOverlay = false): TemplateResult {
    return html`
      <button class="media-item" type="button" aria-label=${item.alt} data-index=${String(index)}>
        ${
          item.type === "image"
            ? html`<img src=${item.url} alt=${item.alt} loading="lazy" />`
            : html`<video src=${item.url} playsinline aria-label=${item.alt}></video>`
        }
        ${withOverlay ? html`<span class="more-overlay">+${this.payload.media!.length - 4}</span>` : nothing}
      </button>
    `;
  }

  private renderMediaGrid(): TemplateResult | typeof nothing {
    const media = this.payload.media;
    if (!media || media.length === 0) {
      return nothing;
    }

    if (media.length === 1) {
      return html`<div class="media-grid one">${this.renderMediaItem(media[0], 0)}</div>`;
    }

    if (media.length === 2) {
      return html`<div class="media-grid two">${media.map((item, index) => this.renderMediaItem(item, index))}</div>`;
    }

    if (media.length === 3) {
      return html`
        <div class="media-grid three">
          <div>${this.renderMediaItem(media[0], 0)}</div>
          <div class="col-right">
            ${this.renderMediaItem(media[1], 1)}
            ${this.renderMediaItem(media[2], 2)}
          </div>
        </div>
      `;
    }

    return html`
      <div class="media-grid four">
        ${media.slice(0, 4).map((item, index) => this.renderMediaItem(item, index, index === 3 && media.length > 4))}
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const relativeTime = this.formatRelativeTime(this.payload.createdAt);
    const likeCount = this.payload.stats?.likes;

    return html`
      <article class="root" data-slot="instagram-post" data-mini-tool-id=${this.payload.id}>
        <section class="card">
          <header class="header">
            <img class="avatar" src=${this.payload.author.avatarUrl} alt=${`${this.payload.author.name} avatar`} loading="lazy" />
            <div class="meta">
              <span class="handle">${this.payload.author.handle}</span>
              ${this.payload.author.verified ? this.renderVerifiedBadge() : nothing}
              ${relativeTime ? html`<span class="dot">·</span><span class="time">${relativeTime}</span>` : nothing}
            </div>
            ${this.renderInstagramLogo()}
          </header>

          ${this.renderMediaGrid()}

          <div class="body">
            <div class="actions">
              <div class="action-wrap">
                <button
                  class=${`action action-like ${this.payload.stats?.isLiked ? "active" : ""}`}
                  type="button"
                  aria-label="Like"
                  @click=${() => this.dispatchAction("like")}
                >
                  ${this.renderHeartIcon()}
                  ${likeCount !== undefined ? html`<span class="count">${this.formatCount(likeCount)}</span>` : nothing}
                </button>
                <span class="tooltip" role="tooltip">Like<span class="tooltip-arrow" aria-hidden="true"></span></span>
              </div>

              <div class="action-wrap">
                <button class="action action-share" type="button" aria-label="Share" @click=${() => this.dispatchAction("share")}>
                  ${this.renderShareIcon()}
                </button>
                <span class="tooltip" role="tooltip">Share<span class="tooltip-arrow" aria-hidden="true"></span></span>
              </div>
            </div>

            ${
              this.payload.text
                ? html`<div class="caption"><span class="caption-handle">${this.payload.author.handle}</span> <span class="caption-text">${this.payload.text}</span></div>`
                : nothing
            }
          </div>
        </section>
      </article>
    `;
  }
}
