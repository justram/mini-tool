import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import stylesText from "./order-summary.css?inline";
import type { OrderDecision, OrderItem, Pricing, SerializableOrderSummary } from "./schema.js";

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatQuantity(quantity: number): string {
  return quantity === 1 ? "" : `Qty: ${quantity}`;
}

function formatDate(isoString: string): string | undefined {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

@customElement("mini-tool-order-summary")
export class MiniToolOrderSummary extends LitElement {
  @property({ attribute: false })
  payload!: SerializableOrderSummary;

  static styles = unsafeCSS(stylesText);

  private renderReceiptBadge(choice: OrderDecision) {
    const formattedDate = choice.confirmedAt ? formatDate(choice.confirmedAt) : undefined;
    const parts = [choice.orderId ? `#${choice.orderId}` : undefined, formattedDate].filter(
      (part): part is string => part !== undefined,
    );

    if (parts.length === 0) {
      return nothing;
    }

    return html`<p class="receipt-meta">${parts.join(" · ")}</p>`;
  }

  private renderItem(item: OrderItem, currency: string) {
    const quantity = item.quantity ?? 1;
    const quantityText = formatQuantity(quantity);
    const hasDescription = Boolean(item.description) || quantityText.length > 0;
    const lineTotal = item.unitPrice * quantity;

    return html`
      <div class="item-row">
        ${
          item.imageUrl
            ? html`<img src=${item.imageUrl} alt=${item.name} width="48" height="48" class="item-image" />`
            : html`
                <div class="item-image placeholder" aria-hidden="true">📦</div>
              `
        }
        <div class="item-content">
          <div class="item-head">
            <span class="item-name">${item.name}</span>
            <span class="item-total">${formatCurrency(lineTotal, currency)}</span>
          </div>
          ${
            hasDescription
              ? html`<div class="item-subtitle"
                >${[item.description, quantityText].filter(Boolean).join(" · ")}</div
              >`
              : nothing
          }
        </div>
      </div>
    `;
  }

  private renderPricing(pricing: Pricing) {
    const currency = pricing.currency ?? "USD";

    return html`
      <dl class="pricing">
        <div class="pricing-row">
          <dt class="muted">Subtotal</dt>
          <dd>${formatCurrency(pricing.subtotal, currency)}</dd>
        </div>

        ${
          pricing.discount !== undefined && pricing.discount > 0
            ? html`
              <div class="pricing-row positive">
                <dt>${pricing.discountLabel ?? "Discount"}</dt>
                <dd>-${formatCurrency(pricing.discount, currency)}</dd>
              </div>
            `
            : nothing
        }

        ${
          pricing.shipping !== undefined
            ? html`
              <div class="pricing-row">
                <dt class="muted">Shipping</dt>
                <dd>
                  ${pricing.shipping === 0 ? "Free" : formatCurrency(pricing.shipping, currency)}
                </dd>
              </div>
            `
            : nothing
        }

        ${
          pricing.tax !== undefined
            ? html`
              <div class="pricing-row">
                <dt class="muted">${pricing.taxLabel ?? "Tax"}</dt>
                <dd>${formatCurrency(pricing.tax, currency)}</dd>
              </div>
            `
            : nothing
        }

        <div class="pricing-row total">
          <dt>Total</dt>
          <dd>${formatCurrency(pricing.total, currency)}</dd>
        </div>
      </dl>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const resolvedVariant = this.payload.variant ?? (this.payload.choice ? "receipt" : "summary");
    const isReceipt = resolvedVariant === "receipt";
    const isMalformedPayload =
      !Array.isArray(this.payload.items) ||
      this.payload.items.length === 0 ||
      this.payload.pricing === undefined ||
      (isReceipt && this.payload.choice === undefined);

    const title = this.payload.title ?? "Order Summary";

    if (isMalformedPayload) {
      return html`
        <article class="container" data-slot="order-summary" data-mini-tool-id=${this.payload.id}>
          <div class="card">
            <h2 class="title">${title}</h2>
            <p class="error-message">Unable to render order summary</p>
          </div>
        </article>
      `;
    }

    return html`
      <article class="container" data-slot="order-summary" data-mini-tool-id=${this.payload.id}>
        <div class=${`card ${isReceipt ? "receipt" : ""}`}>
          <div class="content">
            <header class="header">
              <h2 class="title">
                ${
                  isReceipt
                    ? html`
                        <span class="receipt-icon" aria-hidden="true">✓</span>
                      `
                    : nothing
                }
                ${title}
              </h2>
              ${isReceipt && this.payload.choice ? this.renderReceiptBadge(this.payload.choice) : nothing}
            </header>

            <div class="items">
              ${this.payload.items.map((item) => {
                return this.renderItem(item, this.payload.pricing.currency ?? "USD");
              })}
            </div>

            <div class="separator" aria-hidden="true"></div>

            ${this.renderPricing(this.payload.pricing)}
          </div>
        </div>
      </article>
    `;
  }
}
