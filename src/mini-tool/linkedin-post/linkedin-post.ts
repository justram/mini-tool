import { html, LitElement, nothing, svg, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Share, ThumbsUp } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import stylesText from "./linkedin-post.css?inline";
import type { LinkedInPostMedia, SerializableLinkedInPost } from "./schema.js";

const TEXT_PREVIEW_LENGTH = 280;

@customElement("mini-tool-linkedin-post")
export class MiniToolLinkedInPost extends LitElement {
  @property({ attribute: false })
  payload!: SerializableLinkedInPost;

  @state()
  private expandedText = false;

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

  private dispatchAction(action: "like" | "share"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:linkedin-post-action", {
        detail: {
          action,
          postId: this.payload.id,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderLinkedInLogo() {
    return svg`
      <svg class="linkedin-logo" viewBox="0 0 72 72" role="img" aria-label="LinkedIn logo">
        <g fill="none" fill-rule="evenodd">
          <path
            d="M8 72h56c4.42 0 8-3.58 8-8V8c0-4.42-3.58-8-8-8H8C3.58 0 0 3.58 0 8v56c0 4.42 3.58 8 8 8z"
            fill="currentColor"
          ></path>
          <path
            d="M62 62H51.3V43.8c0-4.98-1.9-7.78-5.83-7.78-4.3 0-6.54 2.9-6.54 7.78V62H28.63V27.33h10.3v4.67c0 0 3.1-5.73 10.45-5.73 7.36 0 12.62 4.5 12.62 13.8V62zM16.35 22.8c-3.5 0-6.35-2.86-6.35-6.4 0-3.52 2.85-6.4 6.35-6.4 3.5 0 6.35 2.88 6.35 6.4 0 3.54-2.85 6.4-6.35 6.4zM11.03 62h10.74V27.33H11.03V62z"
            fill="#fff"
          ></path>
        </g>
      </svg>
    `;
  }

  private renderLikeIcon() {
    return renderLucideIcon(ThumbsUp, { className: "icon", size: 16 });
  }

  private renderShareIcon() {
    return renderLucideIcon(Share, { className: "icon", size: 16 });
  }

  private renderMedia(media: LinkedInPostMedia) {
    return html`
      <div class="media">
        ${
          media.type === "image"
            ? html`<img src=${media.url} alt=${media.alt} loading="lazy" />`
            : html`<video src=${media.url} controls playsinline aria-label=${media.alt}></video>`
        }
      </div>
    `;
  }

  private renderBody() {
    const text = this.payload.text;
    if (!text) {
      return nothing;
    }

    const shouldTruncate = text.length > TEXT_PREVIEW_LENGTH;
    if (!shouldTruncate || this.expandedText) {
      return html`<p class="body-text">${text}</p>`;
    }

    const previewText = `${text.slice(0, TEXT_PREVIEW_LENGTH).trimEnd()}...`;

    return html`<p class="body-text body-text-truncated"
      ><span class="body-preview">${previewText}</span
      ><button
        class="see-more"
        type="button"
        @click=${() => {
          this.expandedText = true;
        }}
      >
        see more
      </button></p
    >`;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const relativeTime = this.formatRelativeTime(this.payload.createdAt);
    const likes = this.payload.stats?.likes;

    return html`
      <article class="root" data-slot="linkedin-post" data-mini-tool-id=${this.payload.id}>
        <section class="card">
          <header class="header">
            <img class="avatar" src=${this.payload.author.avatarUrl} alt=${`${this.payload.author.name} avatar`} loading="lazy" />
            <div class="header-meta">
              <span class="author-name">${this.payload.author.name}</span>
              ${this.payload.author.headline ? html`<span class="headline">${this.payload.author.headline}</span>` : nothing}
              ${relativeTime ? html`<span class="time">${relativeTime} · Edited</span>` : nothing}
            </div>
            ${this.renderLinkedInLogo()}
          </header>

          ${this.renderBody()}
          ${this.payload.media ? this.renderMedia(this.payload.media) : nothing}

          ${
            this.payload.linkPreview && !this.payload.media
              ? html`
                  <a class="link-preview" href=${this.payload.linkPreview.url} target="_blank" rel="noopener noreferrer">
                    ${
                      this.payload.linkPreview.imageUrl
                        ? html`<img class="link-image" src=${this.payload.linkPreview.imageUrl} alt="" loading="lazy" />`
                        : nothing
                    }
                    <div class="link-body">
                      ${this.payload.linkPreview.title ? html`<div class="link-title">${this.payload.linkPreview.title}</div>` : nothing}
                      ${
                        this.resolveDomain(this.payload.linkPreview.url, this.payload.linkPreview.domain)
                          ? html`<div class="link-domain">
                              ${this.resolveDomain(this.payload.linkPreview.url, this.payload.linkPreview.domain)}
                            </div>`
                          : nothing
                      }
                    </div>
                  </a>
                `
              : nothing
          }

          <div class="actions">
            <div class="action-wrap">
              <button class="action action-like" type="button" aria-label="Like" @click=${() => this.dispatchAction("like")}>
                ${this.renderLikeIcon()}
                <span>Like</span>
                ${likes !== undefined ? html`<span class="count">(${this.formatCount(likes)})</span>` : nothing}
              </button>
              <span class="tooltip" role="tooltip">Like<span class="tooltip-arrow" aria-hidden="true"></span></span>
            </div>

            <div class="action-wrap">
              <button class="action action-share" type="button" aria-label="Share" @click=${() => this.dispatchAction("share")}>
                ${this.renderShareIcon()}
                <span>Share</span>
              </button>
              <span class="tooltip" role="tooltip">Share<span class="tooltip-arrow" aria-hidden="true"></span></span>
            </div>
          </div>
        </section>
      </article>
    `;
  }
}
