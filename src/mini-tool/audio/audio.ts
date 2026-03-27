import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import stylesText from "./audio.css?inline";
import type { AudioVariant, SerializableAudio } from "./schema.js";

const FALLBACK_LOCALE = "en-US";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

@customElement("mini-tool-audio")
export class MiniToolAudio extends LitElement {
  @property({ attribute: false })
  payload!: SerializableAudio;

  @property({ type: String })
  variant: AudioVariant = "full";

  @state()
  private isPlaying = false;

  @state()
  private currentTime = 0;

  @state()
  private duration = 0;

  @state()
  private isSeeking = false;

  @query("audio")
  private audioElement?: HTMLAudioElement;

  static styles = unsafeCSS(stylesText);

  private getFallbackDurationFromPayload(): number {
    const seconds = (this.payload?.durationMs ?? 0) / 1000;
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return 0;
    }

    return seconds;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload")) {
      return;
    }

    this.duration = this.getFallbackDurationFromPayload();
    this.currentTime = 0;
    this.isPlaying = false;
    this.isSeeking = false;

    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.pause();
    }
  }

  private emitMediaEvent(type: "play" | "pause"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:audio-media-event", {
        detail: {
          type,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async togglePlayPause(): Promise<void> {
    const audio = this.audioElement;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        return;
      }
      return;
    }

    audio.pause();
  }

  private onPlay(): void {
    this.isPlaying = true;
    this.emitMediaEvent("play");
  }

  private onPause(): void {
    this.isPlaying = false;
    this.emitMediaEvent("pause");
  }

  private onTimeUpdate(event: Event): void {
    if (this.isSeeking) {
      return;
    }

    const target = event.currentTarget as HTMLAudioElement;
    this.currentTime = target.currentTime;
  }

  private onDurationChange(event: Event): void {
    const target = event.currentTarget as HTMLAudioElement;
    if (!Number.isFinite(target.duration) || target.duration <= 0) {
      this.duration = this.getFallbackDurationFromPayload();
      return;
    }

    this.duration = target.duration;
  }

  private onSeekInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    const next = Number(target.value);
    if (!Number.isFinite(next)) {
      return;
    }

    this.currentTime = next;
    if (this.audioElement) {
      this.audioElement.currentTime = next;
    }
  }

  private onSeekStart(): void {
    this.isSeeking = true;
  }

  private onSeekEnd(): void {
    this.isSeeking = false;
  }

  private renderPlayIcon() {
    if (this.isPlaying) {
      return html`
        <span class="pause-icon" aria-hidden="true">❚❚</span>
      `;
    }

    return html`
      <span class="play-icon" aria-hidden="true">▶</span>
    `;
  }

  private renderFull() {
    const hasMeta = Boolean(this.payload.title || this.payload.description);
    const effectiveDuration = this.duration > 0 ? this.duration : this.getFallbackDurationFromPayload();
    const max = effectiveDuration > 0 ? effectiveDuration : 100;

    return html`
      ${
        this.payload.artwork
          ? html`
            <div class="full-artwork">
              <img src=${this.payload.artwork} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            </div>
          `
          : nothing
      }
      <div class="full-content">
        ${
          hasMeta
            ? html`
              <div class="meta">
                ${this.payload.title ? html`<p class="title">${this.payload.title}</p>` : nothing}
                ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
              </div>
            `
            : nothing
        }

        <div class="controls-row">
          <div class="timeline">
            <input
              class="scrubber"
              type="range"
              min="0"
              max=${String(max)}
              step="0.1"
              .value=${String(Math.min(this.currentTime, max))}
              aria-label="Audio progress"
              @input=${this.onSeekInput}
              @pointerdown=${this.onSeekStart}
              @pointerup=${this.onSeekEnd}
              @keydown=${this.onSeekStart}
              @keyup=${this.onSeekEnd}
            />
            <div class="time-row">
              <span>${formatTime(this.currentTime)}</span>
              <span>${formatTime(effectiveDuration)}</span>
            </div>
          </div>

          <button
            class="play-toggle"
            type="button"
            aria-label=${this.isPlaying ? "Pause" : "Play"}
            @click=${this.togglePlayPause}
          >
            ${this.renderPlayIcon()}
          </button>
        </div>
      </div>
    `;
  }

  private renderCompact() {
    const max = this.duration > 0 ? this.duration : 1;
    const progress = Math.min(100, Math.max(0, (this.currentTime / max) * 100));

    return html`
      <div class="compact-root">
        ${
          this.payload.artwork
            ? html`
              <img class="compact-glow" src=${this.payload.artwork} alt="" aria-hidden="true" />
              <div class="compact-overlay"></div>
            `
            : nothing
        }

        ${
          this.payload.artwork
            ? html`
              <div class="compact-artwork">
                <img src=${this.payload.artwork} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              </div>
            `
            : nothing
        }

        <div class="compact-content">
          ${this.payload.title ? html`<p class="compact-title">${this.payload.title}</p>` : nothing}
          ${this.payload.description ? html`<p class="compact-description">${this.payload.description}</p>` : nothing}
          ${
            this.duration > 0
              ? html`
                <div class="compact-progress-row">
                  <div class="compact-progress-track">
                    <div class="compact-progress-fill" style=${`width: ${progress}%;`}></div>
                  </div>
                  <span class="compact-time">${formatTime(this.currentTime)}</span>
                </div>
              `
              : nothing
          }
        </div>

        <button
          class="play-toggle"
          type="button"
          aria-label=${this.isPlaying ? "Pause" : "Play"}
          @click=${this.togglePlayPause}
        >
          ${this.renderPlayIcon()}
        </button>
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const locale = this.payload.locale ?? FALLBACK_LOCALE;
    const variant = this.variant ?? "full";

    return html`
      <article class=${variant} data-mini-tool-id=${this.payload.id} data-slot="audio" lang=${locale}>
        <div class="card">
          ${variant === "compact" ? this.renderCompact() : this.renderFull()}
          <audio
            src=${this.payload.src}
            preload="metadata"
            @play=${this.onPlay}
            @pause=${this.onPause}
            @timeupdate=${this.onTimeUpdate}
            @loadedmetadata=${this.onDurationChange}
            @durationchange=${this.onDurationChange}
          ></audio>
        </div>
      </article>
    `;
  }
}
