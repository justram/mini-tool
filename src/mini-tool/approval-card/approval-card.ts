import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import stylesText from "./approval-card.css?inline";
import type { ApprovalDecision, SerializableApprovalCard } from "./schema.js";

function fallbackIconSymbol(iconName: string): string {
  const normalized = iconName.trim().toLowerCase();

  if (normalized === "rocket") {
    return "🚀";
  }

  if (normalized === "trash-2" || normalized === "trash") {
    return "🗑";
  }

  if (normalized === "mail") {
    return "✉";
  }

  return normalized.charAt(0).toUpperCase();
}

@customElement("mini-tool-approval-card")
export class MiniToolApprovalCard extends LitElement {
  @property({ attribute: false })
  payload!: SerializableApprovalCard;

  static styles = unsafeCSS(stylesText);

  private emitAction(actionId: "confirm" | "cancel"): void {
    const decision: ApprovalDecision = actionId === "confirm" ? "approved" : "denied";

    this.dispatchEvent(
      new CustomEvent("mini-tool:approval-card-action", {
        detail: {
          actionId,
          decision,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onConfirm = (): void => {
    this.emitAction("confirm");
  };

  private onCancel = (): void => {
    this.emitAction("cancel");
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    this.onCancel();
  };

  private renderReceipt(choice: ApprovalDecision) {
    const isApproved = choice === "approved";
    const label = isApproved ? "Approved" : "Denied";

    return html`
      <div
        class="receipt"
        data-slot="approval-card"
        data-mini-tool-id=${this.payload.id}
        data-receipt="true"
        role="status"
        aria-label=${label}
      >
        <span class=${`receipt-icon ${isApproved ? "approved" : ""}`} aria-hidden="true"
          >${isApproved ? "✓" : "×"}</span
        >
        <div>
          <div class="receipt-label">${label}</div>
          <div class="receipt-title">${this.payload.title}</div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    if (this.payload.choice) {
      return this.renderReceipt(this.payload.choice);
    }

    const isDestructive = this.payload.variant === "destructive";
    const confirmLabel = this.payload.confirmLabel ?? "Approve";
    const cancelLabel = this.payload.cancelLabel ?? "Deny";

    return html`
      <article
        class="container"
        data-slot="approval-card"
        data-mini-tool-id=${this.payload.id}
        role="dialog"
        tabindex="0"
        aria-labelledby=${`${this.payload.id}-title`}
        aria-describedby=${this.payload.description ? `${this.payload.id}-description` : nothing}
        @keydown=${this.onKeyDown}
      >
        <div class="card">
          <div class="header">
            ${
              this.payload.icon
                ? html`<span class=${`icon ${isDestructive ? "destructive" : ""}`} aria-hidden="true"
                  >${fallbackIconSymbol(this.payload.icon)}</span
                >`
                : nothing
            }
            <div>
              <h2 class="title" id=${`${this.payload.id}-title`}>${this.payload.title}</h2>
              ${
                this.payload.description
                  ? html`<p class="description" id=${`${this.payload.id}-description`}
                    >${this.payload.description}</p
                  >`
                  : nothing
              }
            </div>
          </div>

          ${
            this.payload.metadata && this.payload.metadata.length > 0
              ? html`
                <dl class="metadata">
                  ${this.payload.metadata.map(
                    (item) => html`
                      <div class="metadata-row">
                        <dt class="metadata-key">${item.key}</dt>
                        <dd class="metadata-value">${item.value}</dd>
                      </div>
                    `,
                  )}
                </dl>
              `
              : nothing
          }
        </div>

        <div class="actions">
          <button class="button" type="button" data-action-id="cancel" @click=${this.onCancel}>
            ${cancelLabel}
          </button>
          <button
            class=${`button confirm ${isDestructive ? "destructive" : ""}`}
            type="button"
            data-action-id="confirm"
            @click=${this.onConfirm}
          >
            ${confirmLabel}
          </button>
        </div>
      </article>
    `;
  }
}
