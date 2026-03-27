import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { ChevronLeft, ChevronRight } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import stylesText from "./item-carousel.css?inline";
import type { ItemCarouselItem, SerializableItemCarousel } from "./schema.js";

const SCROLL_EDGE_THRESHOLD_PX = 8;
const SNAP_EPSILON_PX = 5;
const SCROLL_ANIMATION_DURATION_MS = 300;
const PAGE_SCROLL_RATIO = 0.8;
const PAGE_SCROLL_BREAKPOINT_PX = 640;

type ScrollDirection = "left" | "right";

type ScrollAnimationState = {
  target: number;
  start: number;
  startTime: number;
  duration: number;
};

@customElement("mini-tool-item-carousel")
export class MiniToolItemCarousel extends LitElement {
  @property({ attribute: false })
  payload!: SerializableItemCarousel;

  @query(".track")
  private trackElement!: HTMLDivElement | null;

  @state()
  private canScrollLeft = false;

  @state()
  private canScrollRight = false;

  private resizeObserver: ResizeObserver | null = null;
  private observedTrack: HTMLDivElement | null = null;
  private trackScrollHandler: (() => void) | null = null;
  private scheduledStateFrame: number | null = null;
  private animationFrame: number | null = null;
  private animationState: ScrollAnimationState | null = null;
  private targetIndex: number | null = null;

  static styles = unsafeCSS(stylesText);

  disconnectedCallback(): void {
    this.teardownTrackObservers();
    this.cancelScrollAnimation();
    super.disconnectedCallback();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("payload")) {
      this.targetIndex = null;
    }

    this.setupTrackObservers();
    this.scheduleScrollStateUpdate();
  }

  private setupTrackObservers(): void {
    const track = this.trackElement;
    if (!track || track === this.observedTrack) {
      return;
    }

    this.teardownTrackObservers();

    const onScroll = () => {
      this.scheduleScrollStateUpdate();
    };

    this.trackScrollHandler = onScroll;
    this.observedTrack = track;
    track.addEventListener("scroll", onScroll, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleScrollStateUpdate();
    });
    this.resizeObserver.observe(track);
  }

  private teardownTrackObservers(): void {
    if (this.observedTrack && this.trackScrollHandler) {
      this.observedTrack.removeEventListener("scroll", this.trackScrollHandler);
    }

    this.trackScrollHandler = null;
    this.observedTrack = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.scheduledStateFrame !== null) {
      cancelAnimationFrame(this.scheduledStateFrame);
      this.scheduledStateFrame = null;
    }
  }

  private scheduleScrollStateUpdate(): void {
    if (this.scheduledStateFrame !== null) {
      cancelAnimationFrame(this.scheduledStateFrame);
    }

    this.scheduledStateFrame = requestAnimationFrame(() => {
      this.scheduledStateFrame = null;
      this.updateScrollState();
    });
  }

  private updateScrollState(): void {
    const track = this.trackElement;
    if (!track) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      return;
    }

    const scrollLeft = Math.round(track.scrollLeft);
    const maxScroll = Math.max(0, Math.round(track.scrollWidth - track.clientWidth));

    this.canScrollLeft = scrollLeft > SCROLL_EDGE_THRESHOLD_PX;
    this.canScrollRight = scrollLeft < maxScroll - SCROLL_EDGE_THRESHOLD_PX;
  }

  private cancelScrollAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.animationState = null;

    const track = this.trackElement;
    if (track) {
      track.style.scrollSnapType = "x mandatory";
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  private animateScroll(track: HTMLDivElement, target: number): void {
    if (this.prefersReducedMotion()) {
      track.scrollLeft = target;
      this.targetIndex = null;
      this.scheduleScrollStateUpdate();
      return;
    }

    this.cancelScrollAnimation();

    this.animationState = {
      target,
      start: track.scrollLeft,
      startTime: performance.now(),
      duration: SCROLL_ANIMATION_DURATION_MS,
    };

    track.style.scrollSnapType = "none";

    const step = () => {
      const state = this.animationState;
      if (!state) {
        return;
      }

      const elapsed = performance.now() - state.startTime;
      const progress = Math.min(elapsed / state.duration, 1);
      const eased = 1 - (1 - progress) ** 3;

      track.scrollLeft = state.start + (state.target - state.start) * eased;

      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(step);
        return;
      }

      track.scrollLeft = state.target;
      this.cancelScrollAnimation();
      this.targetIndex = null;
      this.scheduleScrollStateUpdate();
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  private getSnapPositions(track: HTMLDivElement): number[] {
    const paddingValue = window.getComputedStyle(track).scrollPaddingLeft;
    const scrollPaddingLeft = Number.isFinite(Number.parseFloat(paddingValue)) ? Number.parseFloat(paddingValue) : 0;

    const items = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-item]"));
    return items.map((item) => Math.max(0, item.offsetLeft - scrollPaddingLeft));
  }

  private scrollByDirection(direction: ScrollDirection): void {
    const track = this.trackElement;
    if (!track) {
      return;
    }

    const itemElements = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-item]"));
    if (itemElements.length === 0) {
      return;
    }

    const snapPositions = this.getSnapPositions(track);
    const scrollLeft = Math.round(track.scrollLeft);

    let currentIndex = snapPositions.length - 1;
    if (this.animationState !== null) {
      currentIndex = Math.min(this.targetIndex ?? 0, snapPositions.length - 1);
    } else {
      for (let index = 0; index < snapPositions.length; index += 1) {
        const snap = snapPositions[index];
        if (Math.abs(snap - scrollLeft) < SNAP_EPSILON_PX) {
          currentIndex = index;
          break;
        }
        if (snap > scrollLeft) {
          currentIndex = Math.max(0, index - 1);
          break;
        }
      }
    }

    const itemStep = itemElements.length > 1 ? itemElements[1].offsetLeft - itemElements[0].offsetLeft : 0;
    const safeStep = itemStep > 0 ? itemStep : itemElements[0].offsetWidth || 1;

    const pageStep =
      track.clientWidth >= PAGE_SCROLL_BREAKPOINT_PX
        ? Math.max(1, Math.floor((track.clientWidth * PAGE_SCROLL_RATIO) / safeStep))
        : 1;

    const targetIndex =
      direction === "right"
        ? Math.min(currentIndex + pageStep, itemElements.length - 1)
        : Math.max(currentIndex - pageStep, 0);

    this.targetIndex = targetIndex;

    const targetScroll = snapPositions[targetIndex];
    if (Math.abs(targetScroll - track.scrollLeft) <= 1) {
      return;
    }

    this.animateScroll(track, targetScroll);
  }

  private onItemClick(item: ItemCarouselItem): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:item-carousel-item-click", {
        detail: {
          itemId: item.id,
          item,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onActionClick(item: ItemCarouselItem, actionId: string): void {
    const action = item.actions?.find((candidate) => candidate.id === actionId);
    this.dispatchEvent(
      new CustomEvent("mini-tool:item-carousel-action", {
        detail: {
          itemId: item.id,
          actionId,
          item,
          action,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const hasHeader = Boolean(this.payload.title || this.payload.description);

    return html`
      <article class="root" data-mini-tool-id=${this.payload.id} data-slot="item-carousel">
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

        ${
          this.payload.items.length === 0
            ? html`
                <div class="empty">No items to display</div>
              `
            : html`
              <div class="viewport">
                ${
                  this.canScrollLeft
                    ? html`
                        <button
                          type="button"
                          class="nav nav-left"
                          aria-label="Scroll left"
                          @click=${() => this.scrollByDirection("left")}
                        >
                          ${renderLucideIcon(ChevronLeft, { className: "icon", size: 16 })}
                        </button>
                      `
                    : nothing
                }
                ${
                  this.canScrollRight
                    ? html`
                        <button
                          type="button"
                          class="nav nav-right"
                          aria-label="Scroll right"
                          @click=${() => this.scrollByDirection("right")}
                        >
                          ${renderLucideIcon(ChevronRight, { className: "icon", size: 16 })}
                        </button>
                      `
                    : nothing
                }

                <div class="track" role="list">
                  ${this.payload.items.map((item) => {
                    return html`
                      <div class="item" data-carousel-item role="listitem" data-item-id=${item.id}>
                        <article class="card">
                          <button
                            type="button"
                            class="card-hit"
                            aria-label=${`View item: ${item.name}`}
                            @click=${() => this.onItemClick(item)}
                          ></button>

                          <div class="media" aria-hidden="true">
                            ${
                              item.image
                                ? html`<img src=${item.image} alt=${item.name} loading="lazy" decoding="async" draggable="false" />`
                                : html`
                                  <div
                                    class="media-fallback"
                                    style=${item.color ? `background-color:${item.color};` : nothing}
                                    role="img"
                                    aria-label=${item.name}
                                  ></div>
                                `
                            }
                          </div>

                          <div class="content">
                            <h4 class="name">${item.name}</h4>
                            ${item.subtitle ? html`<p class="subtitle">${item.subtitle}</p>` : nothing}
                            ${
                              item.actions && item.actions.length > 0
                                ? html`
                                  <div class="actions">
                                    ${item.actions.map((action) => {
                                      const variant = action.variant ?? "default";
                                      return html`
                                        <button
                                          type="button"
                                          class=${`action variant-${variant}`}
                                          ?disabled=${Boolean(action.disabled)}
                                          @click=${(event: MouseEvent) => {
                                            event.stopPropagation();
                                            this.onActionClick(item, action.id);
                                          }}
                                        >
                                          ${action.label}
                                        </button>
                                      `;
                                    })}
                                  </div>
                                `
                                : nothing
                            }
                          </div>
                        </article>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `
        }
      </article>
    `;
  }
}
