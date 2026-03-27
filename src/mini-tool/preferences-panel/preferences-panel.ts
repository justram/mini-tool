import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./preferences-panel.css?inline";
import type {
  PreferenceItem,
  PreferenceSection,
  PreferencesValue,
  SerializablePreferencesPanel,
  SerializablePreferencesPanelReceipt,
} from "./schema.js";

type PreferencesPanelPayload = SerializablePreferencesPanel | SerializablePreferencesPanelReceipt;

type NormalizedAction = {
  id: string;
  label: string;
  disabled?: boolean;
  variant?: "default" | "destructive" | "secondary" | "ghost" | "outline";
};

function getInitialItemValue(item: PreferenceItem): string | boolean {
  if (item.type === "switch") {
    return item.defaultChecked ?? false;
  }

  if (item.type === "toggle") {
    return item.defaultValue ?? item.options[0]?.value ?? "";
  }

  return item.defaultSelected ?? item.selectOptions[0]?.value ?? "";
}

function computeInitialValues(sections: PreferenceSection[]): PreferencesValue {
  return sections.reduce<PreferencesValue>((next, section) => {
    section.items.forEach((item) => {
      next[item.id] = getInitialItemValue(item);
    });
    return next;
  }, {});
}

function formatDisplayValue(item: PreferenceItem, value: string | boolean): string {
  if (item.type === "switch") {
    return value === true ? "On" : "Off";
  }

  const textValue = typeof value === "string" ? value : "";
  const options = item.type === "toggle" ? item.options : item.selectOptions;
  const found = options.find((option) => option.value === textValue);
  return found?.label ?? textValue;
}

function isReceiptPayload(payload: PreferencesPanelPayload): payload is SerializablePreferencesPanelReceipt {
  return "choice" in payload;
}

@customElement("mini-tool-preferences-panel")
export class MiniToolPreferencesPanel extends LitElement {
  @property({ attribute: false })
  payload!: PreferencesPanelPayload;

  @state()
  private currentValue: PreferencesValue = {};

  private payloadSignature = "";

  static styles = unsafeCSS(stylesText);

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload || isReceiptPayload(this.payload)) {
      return;
    }

    const nextSignature = JSON.stringify(this.payload.sections);
    if (nextSignature === this.payloadSignature) {
      return;
    }

    this.payloadSignature = nextSignature;
    this.currentValue = computeInitialValues(this.payload.sections);
  }

  private updateValue(itemId: string, value: string | boolean): void {
    this.currentValue = {
      ...this.currentValue,
      [itemId]: value,
    };
  }

  private resetToDefaults(): void {
    if (!this.payload || isReceiptPayload(this.payload)) {
      return;
    }

    this.currentValue = computeInitialValues(this.payload.sections);
  }

  private resolveActions(): { items: NormalizedAction[]; align: "left" | "center" | "right" } {
    if (!this.payload || isReceiptPayload(this.payload) || !this.payload.actions) {
      return {
        align: "right",
        items: [
          { id: "cancel", label: "Cancel", variant: "ghost" },
          { id: "save", label: "Save Changes", variant: "default" },
        ],
      };
    }

    if (Array.isArray(this.payload.actions)) {
      return {
        align: "right",
        items: this.payload.actions.map((action) => ({
          id: action.id,
          label: action.label,
          disabled: action.disabled,
          variant: action.variant,
        })),
      };
    }

    return {
      align: this.payload.actions.align ?? "right",
      items: this.payload.actions.items.map((action) => ({
        id: action.id,
        label: action.label,
        disabled: action.disabled,
        variant: action.variant,
      })),
    };
  }

  private isDirty(): boolean {
    if (!this.payload || isReceiptPayload(this.payload)) {
      return false;
    }

    const initial = computeInitialValues(this.payload.sections);
    return Object.keys(initial).some((key) => initial[key] !== this.currentValue[key]);
  }

  private emitAction(actionId: string): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:preferences-panel-action", {
        detail: {
          actionId,
          value: { ...this.currentValue },
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleAction(actionId: string): void {
    if (actionId === "cancel") {
      this.resetToDefaults();
    }

    this.emitAction(actionId);
  }

  private renderEditableControl(item: PreferenceItem, value: string | boolean) {
    if (item.type === "switch") {
      return html`<label class="switch-control mt-control-switch">
        <input
          class="switch-input mt-control-switch-input"
          type="checkbox"
          role="switch"
          aria-label=${item.label}
          ?checked=${value === true}
          @change=${(event: Event) => {
            const target = event.currentTarget;
            if (target instanceof HTMLInputElement) {
              this.updateValue(item.id, target.checked);
            }
          }}
        />
        <span class="switch-thumb mt-control-switch-thumb" aria-hidden="true"></span>
      </label>`;
    }

    if (item.type === "toggle") {
      const selected = typeof value === "string" ? value : "";

      return html`<div class="toggle-group" role="group" aria-label=${item.label}>
        ${item.options.map((option) => {
          const isSelected = selected === option.value;

          return html`<button
            type="button"
            class=${`toggle-option mt-control-button mt-control-pill-option${isSelected ? " selected is-selected" : ""}`}
            aria-pressed=${isSelected ? "true" : "false"}
            @click=${() => this.updateValue(item.id, option.value)}
          >
            ${option.label}
          </button>`;
        })}
      </div>`;
    }

    const selected = typeof value === "string" ? value : "";

    return html`<select
      class="select-input mt-control-select"
      aria-label=${item.label}
      .value=${selected}
      @change=${(event: Event) => {
        const target = event.currentTarget;
        if (target instanceof HTMLSelectElement) {
          this.updateValue(item.id, target.value);
        }
      }}
    >
      ${item.selectOptions.map((option) => {
        return html`<option value=${option.value}>${option.label}</option>`;
      })}
    </select>`;
  }

  private renderItemRow(item: PreferenceItem, valueMap: PreferencesValue, error?: string, receiptMode = false) {
    const value = valueMap[item.id] ?? getInitialItemValue(item);

    return html`<div class="item-row">
      <div>
        <p class="item-label">${item.label}</p>
        ${
          error
            ? html`<p class="item-error">${error}</p>`
            : item.description
              ? html`<p class="item-description">${item.description}</p>`
              : nothing
        }
      </div>
      <div class="control-wrap">
        ${
          receiptMode
            ? html`<span class="receipt-value">${formatDisplayValue(item, value)}</span>`
            : this.renderEditableControl(item, value)
        }
      </div>
    </div>`;
  }

  private renderSection(
    section: PreferenceSection,
    valueMap: PreferencesValue,
    errors?: Record<string, string>,
    receipt = false,
  ) {
    return html`<section>
      ${section.heading ? html`<p class="section-heading">${section.heading}</p>` : nothing}
      <div class="items">
        ${section.items.map((item) => this.renderItemRow(item, valueMap, errors?.[item.id], receipt))}
      </div>
    </section>`;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    if (isReceiptPayload(this.payload)) {
      const receiptPayload = this.payload;
      const hasErrors = Boolean(receiptPayload.error && Object.keys(receiptPayload.error).length > 0);

      return html`<article
        class="root"
        data-slot="preferences-panel"
        data-mini-tool-id=${receiptPayload.id}
        data-receipt="true"
        role="status"
        aria-label=${hasErrors ? "Preferences with errors" : "Confirmed preferences"}
      >
        <div class="surface">
          ${
            receiptPayload.title
              ? html`<div class="header">
                <h2 class="title">${receiptPayload.title}</h2>
                <span class=${`status-chip ${hasErrors ? "error" : "saved"}`}>${hasErrors ? "Error" : "Saved"}</span>
              </div>`
              : nothing
          }
          <div class="content">
            ${receiptPayload.sections.map((section) => {
              return this.renderSection(section, receiptPayload.choice, receiptPayload.error, true);
            })}
          </div>
        </div>
      </article>`;
    }

    const actionsConfig = this.resolveActions();
    const dirty = this.isDirty();

    return html`<article class="root" data-slot="preferences-panel" data-mini-tool-id=${this.payload.id} role="form">
      <div class="surface">
        ${
          this.payload.title
            ? html`<div class="header">
              <h2 class="title">${this.payload.title}</h2>
            </div>`
            : nothing
        }
        <div class="content">
          ${this.payload.sections.map((section) => {
            return this.renderSection(section, this.currentValue);
          })}
        </div>
      </div>
      <div class="actions" style=${`justify-content: ${actionsConfig.align};`}>
        ${actionsConfig.items.map((action) => {
          const disabled = action.disabled ?? (action.id === "save" && !dirty);

          return html`<button
            type="button"
            class="action mt-control-button"
            data-action-id=${action.id}
            data-variant=${action.variant ?? "default"}
            ?disabled=${disabled}
            @click=${() => this.handleAction(action.id)}
          >
            ${action.label}
          </button>`;
        })}
      </div>
    </article>`;
  }
}
