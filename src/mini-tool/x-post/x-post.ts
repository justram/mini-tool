import { html, LitElement, nothing, svg, type TemplateResult, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Heart, Share } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import type { SerializableXPost, XPostMedia } from "./schema.js";
import stylesText from "./x-post.css?inline";

@customElement("mini-tool-x-post")
export class MiniToolXPost extends LitElement {
  @property({ attribute: false })
  payload!: SerializableXPost;

  static styles = unsafeCSS(stylesText);

  private formatRelativeTime(iso: string | undefined): string {
    if (!iso) {
      return "";
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) {
      return `${Math.max(1, seconds)}s`;
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

  private resolveAspectRatio(media: XPostMedia): string {
    if (media.aspectRatio === "1:1") {
      return "1 / 1";
    }

    if (media.aspectRatio === "4:3") {
      return "4 / 3";
    }

    if (media.aspectRatio === "9:16") {
      return "9 / 16";
    }

    return "16 / 9";
  }

  private resolveDomain(url: string, domain: string | undefined): string {
    if (domain) {
      return domain;
    }

    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  private renderVerifiedBadge(sizeClass = "badge"): TemplateResult {
    return svg`<svg class=${sizeClass} viewBox="0 0 24 24" role="img" aria-label="Verified account"><path fill="currentColor" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>`;
  }

  private renderXLogo(): TemplateResult {
    return svg`<svg class="x-logo" viewBox="0 0 300 271" role="img" aria-label="X (formerly Twitter) logo"><path fill="currentColor" d="m236 0h46l-101 115 118 156h-92.6l-72.5-94.8-83 94.8h-46l107-123-113-148h94.9l65.5 86.6zm-16.1 244h25.5l-165-218h-27.4z"/></svg>`;
  }

  private renderHeartIcon(): TemplateResult {
    return renderLucideIcon(Heart, { className: "icon heart-icon", size: 16 });
  }

  private renderShareIcon(): TemplateResult {
    return renderLucideIcon(Share, { className: "icon share-icon", size: 16 });
  }

  private renderMedia(): TemplateResult | typeof nothing {
    const media = this.payload.media;
    if (!media) {
      return nothing;
    }

    return html`
      <button class="media" style=${`aspect-ratio: ${this.resolveAspectRatio(media)};`} type="button" aria-label=${media.alt}>
        ${
          media.type === "image"
            ? html`<img src=${media.url} alt=${media.alt} loading="lazy" />`
            : html`<video src=${media.url} controls playsinline aria-label=${media.alt}></video>`
        }
      </button>
    `;
  }

  private renderQuotedPost(): TemplateResult | typeof nothing {
    const quoted = this.payload.quotedPost;
    if (!quoted) {
      return nothing;
    }

    return html`
      <div class="quote">
        <div class="quote-meta">
          <img class="quote-avatar" src=${quoted.author.avatarUrl} alt=${`${quoted.author.name} avatar`} loading="lazy" />
          <span class="quote-name">${quoted.author.name}</span>
          ${quoted.author.verified ? this.renderVerifiedBadge("quote-badge") : nothing}
          <span class="quote-handle">@${quoted.author.handle}</span>
          ${
            quoted.createdAt
              ? html`<span class="quote-dot">·</span><span class="quote-time">${this.formatRelativeTime(quoted.createdAt)}</span>`
              : nothing
          }
        </div>
        ${quoted.text ? html`<p class="quote-text">${quoted.text}</p>` : nothing}
        ${
          quoted.media && quoted.media.type === "image"
            ? html`<img class="quote-image" src=${quoted.media.url} alt=${quoted.media.alt} loading="lazy" />`
            : nothing
        }
      </div>
    `;
  }

  private renderLinkPreview(): TemplateResult | typeof nothing {
    if (!this.payload.linkPreview || this.payload.quotedPost) {
      return nothing;
    }

    const preview = this.payload.linkPreview;
    const domain = this.resolveDomain(preview.url, preview.domain);

    return html`
      <a class="link-preview" href=${preview.url} target="_blank" rel="noopener noreferrer">
        ${preview.imageUrl ? html`<img class="link-image" src=${preview.imageUrl} alt="" loading="lazy" />` : nothing}
        <div class="link-body">
          ${domain ? html`<div class="link-domain">${domain}</div>` : nothing}
          ${preview.title ? html`<div class="link-title">${preview.title}</div>` : nothing}
          ${preview.description ? html`<div class="link-description">${preview.description}</div>` : nothing}
        </div>
      </a>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const relativeTime = this.formatRelativeTime(this.payload.createdAt);
    const likes = this.payload.stats?.likes;

    return html`
      <article class="root" data-slot="x-post" data-mini-tool-id=${this.payload.id}>
        <div class="layout">
          <img class="avatar" src=${this.payload.author.avatarUrl} alt=${`${this.payload.author.name} avatar`} loading="lazy" />

          <div class="main">
            <div class="header">
              <div class="meta">
                <span class="name">${this.payload.author.name}</span>
                ${this.payload.author.verified ? this.renderVerifiedBadge() : nothing}
                <span class="handle">@${this.payload.author.handle}</span>
                ${relativeTime ? html`<span class="dot">·</span><span class="time">${relativeTime}</span>` : nothing}
              </div>
              ${this.renderXLogo()}
            </div>

            ${this.payload.text ? html`<p class="text">${this.payload.text}</p>` : nothing}
            ${this.renderMedia()}
            ${this.renderQuotedPost()}
            ${this.renderLinkPreview()}

            <div class="actions">
              <div class="action-wrap">
                <button class="action mt-control-button action-like" type="button" aria-label="Like">
                  ${this.renderHeartIcon()}
                  ${likes !== undefined ? html`<span class="count">${this.formatCount(likes)}</span>` : nothing}
                </button>
                <span class="tooltip" role="tooltip">Like<span class="tooltip-arrow" aria-hidden="true"></span></span>
              </div>

              <div class="action-wrap">
                <button class="action mt-control-button action-share" type="button" aria-label="Share">${this.renderShareIcon()}</button>
                <span class="tooltip" role="tooltip">Share<span class="tooltip-arrow" aria-hidden="true"></span></span>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }
}
