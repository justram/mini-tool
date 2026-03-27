import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./option-list.css?inline";
import type { OptionListSelection, SerializableOptionList } from "./schema.js";
import { normalizeSelectionForOptions, parseSelectionToIdSet } from "./selection.js";

function convertIdSetToSelection(selected: Set<string>, mode: "multi" | "single"): OptionListSelection {
  if (mode === "single") {
    const [first] = selected;
    return first ?? null;
  }

  return Array.from(selected);
}

@customElement("mini-tool-option-list")
export class MiniToolOptionList extends LitElement {
  @property({ attribute: false })
  payload!: SerializableOptionList;

  @state()
  private selectedIds = new Set<string>();

  @state()
  private activeIndex = 0;

  static styles = unsafeCSS(stylesText);

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload) {
      return;
    }

    const selectionMode = this.payload.selectionMode ?? "multi";
    const effectiveMax = selectionMode === "single" ? 1 : this.payload.maxSelections;
    const optionIds = new Set(this.payload.options.map((option) => option.id));

    this.selectedIds = normalizeSelectionForOptions(
      parseSelectionToIdSet(this.payload.defaultValue, selectionMode, effectiveMax),
      optionIds,
    );

    const firstEnabledIndex = this.payload.options.findIndex((option) => !option.disabled);
    this.activeIndex = firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
  }

  private emitAction(actionId: "confirm" | "cancel"): void {
    const mode = this.payload.selectionMode ?? "multi";
    const value = convertIdSetToSelection(this.selectedIds, mode);

    this.dispatchEvent(
      new CustomEvent("mini-tool:option-list-action", {
        detail: {
          actionId,
          value,
          payload: this.payload,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private toggleSelection(optionId: string): void {
    const mode = this.payload.selectionMode ?? "multi";
    const maxSelections = mode === "single" ? 1 : this.payload.maxSelections;
    const next = new Set(this.selectedIds);
    const isSelected = next.has(optionId);

    if (mode === "single") {
      if (isSelected) {
        next.delete(optionId);
      } else {
        next.clear();
        next.add(optionId);
      }
    } else if (isSelected) {
      next.delete(optionId);
    } else {
      if (maxSelections !== undefined && next.size >= maxSelections) {
        return;
      }
      next.add(optionId);
    }

    this.selectedIds = next;
  }

  private focusOptionAt(index: number): void {
    const options = this.renderRoot.querySelectorAll<HTMLButtonElement>("button[role='option']");
    options[index]?.focus();
    this.activeIndex = index;
  }

  private handleListboxKeydown(event: KeyboardEvent): void {
    const optionStates = this.getOptionStates();
    if (optionStates.length === 0) {
      return;
    }

    const findNextEnabled = (start: number, direction: 1 | -1): number => {
      const len = optionStates.length;
      for (let step = 1; step <= len; step += 1) {
        const idx = (start + direction * step + len) % len;
        if (!optionStates[idx].isDisabled) {
          return idx;
        }
      }
      return start;
    };

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.focusOptionAt(findNextEnabled(this.activeIndex, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.focusOptionAt(findNextEnabled(this.activeIndex, -1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstEnabled = optionStates.findIndex((state) => !state.isDisabled);
      this.focusOptionAt(firstEnabled >= 0 ? firstEnabled : 0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const reversed = [...optionStates].reverse();
      const fromEnd = reversed.findIndex((state) => !state.isDisabled);
      const lastEnabled = fromEnd < 0 ? 0 : optionStates.length - 1 - fromEnd;
      this.focusOptionAt(lastEnabled);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const current = optionStates[this.activeIndex];
      if (!current || current.isDisabled) {
        return;
      }
      this.toggleSelection(current.option.id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (this.selectedIds.size === 0) {
        return;
      }
      this.selectedIds = new Set();
      this.emitAction("cancel");
    }
  }

  private handleConfirm(): void {
    this.emitAction("confirm");
  }

  private handleCancel(): void {
    this.selectedIds = new Set();
    this.emitAction("cancel");
  }

  private getConfiguredActions(): Array<{ id: string; label: string }> {
    if (!this.payload.actions) {
      return [
        { id: "cancel", label: "Clear" },
        { id: "confirm", label: "Confirm" },
      ];
    }

    if (Array.isArray(this.payload.actions)) {
      return this.payload.actions.map((action) => ({ id: action.id, label: action.label }));
    }

    return this.payload.actions.items.map((action) => ({ id: action.id, label: action.label }));
  }

  private getActionLabel(actionId: "cancel" | "confirm", fallback: string): string {
    const configured = this.getConfiguredActions().find((action) => action.id === actionId);
    return configured?.label ?? fallback;
  }

  private getOptionStates(): Array<{
    option: SerializableOptionList["options"][number];
    isSelected: boolean;
    isDisabled: boolean;
  }> {
    const mode = this.payload.selectionMode ?? "multi";
    const maxSelections = mode === "single" ? 1 : this.payload.maxSelections;
    const selectedCount = this.selectedIds.size;

    return this.payload.options.map((option) => {
      const isSelected = this.selectedIds.has(option.id);
      const isLockedByMax =
        mode === "multi" && maxSelections !== undefined && selectedCount >= maxSelections && !isSelected;

      return {
        option,
        isSelected,
        isDisabled: Boolean(option.disabled || isLockedByMax),
      };
    });
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const mode = this.payload.selectionMode ?? "multi";
    const minSelections = this.payload.minSelections ?? 1;
    const isReceipt = this.payload.choice !== undefined && this.payload.choice !== null;
    const optionIds = new Set(this.payload.options.map((option) => option.id));

    if (isReceipt) {
      const selected = normalizeSelectionForOptions(parseSelectionToIdSet(this.payload.choice, mode), optionIds);
      const confirmedOptions = this.payload.options.filter((option) => selected.has(option.id));

      return html`
        <div
          class="receipt"
          data-slot="option-list"
          data-mini-tool-id=${this.payload.id}
          data-receipt="true"
          role="status"
          aria-label="Confirmed selection"
        >
          ${confirmedOptions.map(
            (option) => html`
              <div>
                <div>${option.label}</div>
                ${option.description ? html`<div class="description">${option.description}</div>` : nothing}
              </div>
            `,
          )}
        </div>
      `;
    }

    const optionStates = this.getOptionStates();
    const selectedCount = this.selectedIds.size;
    const isConfirmDisabled = selectedCount < minSelections || selectedCount === 0;
    const isClearDisabled = selectedCount === 0;
    const cancelLabel = this.getActionLabel("cancel", "Clear");
    const confirmLabel = this.getActionLabel("confirm", "Confirm");

    return html`
      <div
        class="root"
        data-slot="option-list"
        data-mini-tool-id=${this.payload.id}
        role="group"
        aria-label="Option list"
      >
        <div
          class="options"
          role="listbox"
          aria-multiselectable=${String(mode === "multi")}
          @keydown=${this.handleListboxKeydown}
        >
          ${optionStates.map(
            ({ option, isSelected, isDisabled }, index) => html`
              <button
                class="option"
                type="button"
                role="option"
                data-id=${option.id}
                aria-selected=${String(isSelected)}
                ?disabled=${isDisabled}
                tabindex=${this.activeIndex === index ? "0" : "-1"}
                @focus=${() => {
                  this.activeIndex = index;
                }}
                @click=${() => this.toggleSelection(option.id)}
              >
                <div>${option.label}</div>
                ${option.description ? html`<div class="description">${option.description}</div>` : nothing}
              </button>
            `,
          )}
        </div>

        <div class="actions">
          <button
            class="action mt-control-button"
            type="button"
            data-action-id="cancel"
            data-variant="ghost"
            ?disabled=${isClearDisabled}
            @click=${this.handleCancel}
          >
            ${cancelLabel}
          </button>
          <button
            class="action mt-control-button"
            type="button"
            data-action-id="confirm"
            data-variant="default"
            ?disabled=${isConfirmDisabled}
            @click=${this.handleConfirm}
          >
            ${confirmLabel}${mode === "multi" && selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </div>
      </div>
    `;
  }
}
