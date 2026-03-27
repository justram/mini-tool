import { html, LitElement, nothing, svg, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./message-draft.css?inline";
import type {
  MessageDraftOutcome,
  SerializableEmailDraft,
  SerializableMessageDraft,
  SerializableSlackDraft,
} from "./schema.js";

type DraftState = "review" | "sending" | "sent" | "cancelled";

const DEFAULT_GRACE_PERIOD_MS = 5000;
const COLLAPSED_BODY_HEIGHT_PX = 280;

function resolveDraftState(outcome: MessageDraftOutcome | undefined): DraftState {
  if (outcome === "sent") {
    return "sent";
  }

  if (outcome === "cancelled") {
    return "cancelled";
  }

  return "review";
}

function formatSentTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

@customElement("mini-tool-message-draft")
export class MiniToolMessageDraft extends LitElement {
  @property({ attribute: false })
  payload!: SerializableMessageDraft;

  @state()
  private draftState: DraftState = "review";

  @state()
  private countdown = Math.ceil(DEFAULT_GRACE_PERIOD_MS / 1000);

  @state()
  private sentAt: Date | null = null;

  @state()
  private isExpanded = false;

  @state()
  private needsExpansion = false;

  private sendTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private previousOutcome: MessageDraftOutcome | undefined;

  static styles = unsafeCSS(stylesText);

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.clearTimers();
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload) {
      return;
    }

    if (this.previousOutcome === this.payload.outcome && changed.has("payload")) {
      return;
    }

    this.previousOutcome = this.payload.outcome;

    const nextState = resolveDraftState(this.payload.outcome);
    this.clearTimers();
    this.draftState = nextState;
    this.countdown = Math.ceil(this.resolveUndoGracePeriod() / 1000);
    this.sentAt = nextState === "sent" ? new Date() : null;
    this.isExpanded = false;
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("payload") || changed.has("isExpanded")) {
      this.syncBodyOverflowState();
    }
  }

  private resolveUndoGracePeriod(): number {
    return this.payload.undoGracePeriod ?? DEFAULT_GRACE_PERIOD_MS;
  }

  private clearTimers(): void {
    if (this.sendTimer) {
      clearTimeout(this.sendTimer);
      this.sendTimer = null;
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  public resetDraftState(): void {
    if (!this.payload) {
      return;
    }

    this.clearTimers();
    const nextState = resolveDraftState(this.payload.outcome);
    this.draftState = nextState;
    this.countdown = Math.ceil(this.resolveUndoGracePeriod() / 1000);
    this.sentAt = nextState === "sent" ? new Date() : null;
    this.isExpanded = false;
  }

  private emitAction(actionId: "send" | "undo" | "cancel"): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:message-draft-action", {
        detail: {
          actionId,
          state: this.draftState,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private startSendingFlow = async (): Promise<void> => {
    if (this.draftState !== "review") {
      return;
    }

    const gracePeriod = this.resolveUndoGracePeriod();

    this.clearTimers();
    this.draftState = "sending";
    this.countdown = Math.ceil(gracePeriod / 1000);

    await this.updateComplete;
    const undoButton = this.renderRoot.querySelector<HTMLButtonElement>(".action-undo");
    undoButton?.focus();

    this.countdownTimer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
      if (this.countdown <= 0 && this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 1000);

    this.sendTimer = setTimeout(() => {
      this.clearTimers();
      this.sentAt = new Date();
      this.draftState = "sent";
      this.emitAction("send");
    }, gracePeriod);
  };

  private handleUndo = (): void => {
    if (this.draftState !== "sending") {
      return;
    }

    this.clearTimers();
    this.draftState = "review";
    this.countdown = Math.ceil(this.resolveUndoGracePeriod() / 1000);
    this.emitAction("undo");
  };

  private handleCancel = (): void => {
    if (this.draftState !== "review") {
      return;
    }

    this.clearTimers();
    this.draftState = "cancelled";
    this.emitAction("cancel");
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || this.draftState !== "review") {
      return;
    }

    event.preventDefault();
    this.handleCancel();
  };

  private toggleExpanded = (): void => {
    this.isExpanded = !this.isExpanded;
  };

  private syncBodyOverflowState(): void {
    const body = this.renderRoot.querySelector<HTMLElement>(".body-content");
    if (!body) {
      return;
    }

    const nextNeedsExpansion = body.scrollHeight > COLLAPSED_BODY_HEIGHT_PX;
    this.needsExpansion = nextNeedsExpansion;
  }

  private renderSlackLogo() {
    return svg`
      <svg class="slack-logo" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
        <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
        <path fill="#2EB67D" d="M18.958 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.52 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312z"/>
        <path fill="#ECB22E" d="M15.165 18.958a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.52v-2.522h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/>
      </svg>
    `;
  }

  private renderEmailMeta(draft: SerializableEmailDraft) {
    const renderRow = (label: string, value: string, muted = false) => {
      return html`
        <tr class="meta-row">
          <td class="meta-label">${label}</td>
          <td class=${`meta-value ${muted ? "muted" : ""}`}>${value}</td>
        </tr>
      `;
    };

    const toValue = draft.to.join(", ");
    const ccValue = draft.cc && draft.cc.length > 0 ? draft.cc.join(", ") : null;
    const bccValue = draft.bcc && draft.bcc.length > 0 ? draft.bcc.join(", ") : null;

    return html`
      <h2 class="title" id=${`${this.payload.id}-title`}>${draft.subject}</h2>
      <table class="meta-table">
        <tbody>
          ${draft.from ? renderRow("From", draft.from) : nothing}
          ${renderRow("To", toValue)}
          ${ccValue ? renderRow("Cc", ccValue) : nothing}
          ${bccValue ? renderRow("Bcc", bccValue, true) : nothing}
        </tbody>
      </table>
      <hr class="separator" />
    `;
  }

  private renderSlackMeta(draft: SerializableSlackDraft) {
    const targetLabel = draft.target.type === "channel" ? `#${draft.target.name}` : `Message to @${draft.target.name}`;

    return html`
      <div class="content-header" id=${`${this.payload.id}-title`}>
        ${this.renderSlackLogo()}
        <span>${targetLabel}</span>
        ${
          draft.target.type === "channel" && draft.target.memberCount !== undefined
            ? html`<span class="member-count">${draft.target.memberCount.toLocaleString()} members</span>`
            : nothing
        }
      </div>
      <hr class="separator" />
    `;
  }

  private renderBody() {
    const body = this.payload.body;
    const maxHeight = this.isExpanded || !this.needsExpansion ? "none" : `${COLLAPSED_BODY_HEIGHT_PX}px`;

    return html`
      <div class="body-wrap">
        <div class="body-content" style=${`max-height: ${maxHeight};`}>
          <p class="body-text">${body}</p>
        </div>
        ${
          this.needsExpansion && !this.isExpanded
            ? html`
                <div class="body-fade"></div>
              `
            : nothing
        }
      </div>
      ${
        this.needsExpansion
          ? html`<button class="expand-button" type="button" @click=${this.toggleExpanded}>
            ${this.isExpanded ? "Show less" : "Read more"}
          </button>`
          : nothing
      }
    `;
  }

  private renderActions() {
    if (this.draftState === "sending") {
      return html`
        <div class="actions" aria-live="polite">
          <span class="sending-label">Sending in ${this.countdown}s</span>
          <button class="action action-undo" type="button" @click=${this.handleUndo}>Undo</button>
        </div>
      `;
    }

    if (this.draftState === "sent") {
      return html`
        <div class="receipt" role="status" aria-label="Message sent">
          <span class="receipt-time">Sent at ${formatSentTime(this.sentAt ?? new Date())}</span>
          <span class="receipt-icon" aria-hidden="true">✓</span>
        </div>
      `;
    }

    if (this.draftState === "cancelled") {
      return html`
        <div class="receipt" role="status" aria-label="Draft cancelled">
          <span class="receipt-time">Draft cancelled</span>
          <span class="receipt-icon receipt-icon-cancelled" aria-hidden="true">×</span>
        </div>
      `;
    }

    return html`
      <div class="actions">
        <button class="action" type="button" @click=${this.handleCancel}>Cancel</button>
        <button class="action action-primary" type="button" @click=${this.startSendingFlow}>Send</button>
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    return html`
      <article
        class="container"
        data-slot="message-draft"
        data-mini-tool-id=${this.payload.id}
        data-state=${this.draftState}
        tabindex="0"
        aria-labelledby=${`${this.payload.id}-title`}
        @keydown=${this.handleKeyDown}
      >
        <div class="card">
          ${this.payload.channel === "email" ? this.renderEmailMeta(this.payload) : this.renderSlackMeta(this.payload)}
          ${this.renderBody()}
        </div>
        ${this.renderActions()}
      </article>
    `;
  }
}
