import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./question-flow.css?inline";
import type {
  QuestionFlowOption,
  QuestionFlowSelectionMode,
  SerializableProgressiveMode,
  SerializableQuestionFlow,
  SerializableUpfrontMode,
} from "./schema.js";

type TransitionDirection = "forward" | "backward";

type StepRenderState = {
  stepNumber: number;
  stepKey: string;
  title: string;
  description?: string;
  options: QuestionFlowOption[];
  selectionMode: QuestionFlowSelectionMode;
  selectedIds: Set<string>;
};

function findFirstSelectableOptionIndex(options: QuestionFlowOption[], selectedIds: Set<string>): number {
  const selectedIndex = options.findIndex((option) => selectedIds.has(option.id) && !option.disabled);
  if (selectedIndex >= 0) {
    return selectedIndex;
  }

  const firstEnabled = options.findIndex((option) => !option.disabled);
  return firstEnabled >= 0 ? firstEnabled : 0;
}

@customElement("mini-tool-question-flow")
export class MiniToolQuestionFlow extends LitElement {
  @property({ attribute: false })
  payload!: SerializableQuestionFlow;

  @state()
  private progressiveSelectedIds = new Set<string>();

  @state()
  private upfrontAnswers: Record<string, string[]> = {};

  @state()
  private currentStepIndex = 0;

  @state()
  private activeOptionIndex = 0;

  @state()
  private exitingStepState: StepRenderState | null = null;

  @state()
  private transitionDirection: TransitionDirection | null = null;

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  static styles = unsafeCSS(stylesText);

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload) {
      return;
    }

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.exitingStepState = null;
    this.transitionDirection = null;

    if (this.isProgressiveMode(this.payload)) {
      this.progressiveSelectedIds = new Set();
      this.upfrontAnswers = {};
      this.currentStepIndex = 0;
      this.activeOptionIndex = findFirstSelectableOptionIndex(this.payload.options, this.progressiveSelectedIds);
      return;
    }

    if (this.isUpfrontMode(this.payload)) {
      this.progressiveSelectedIds = new Set();
      this.upfrontAnswers = {};
      this.currentStepIndex = 0;
      const firstStep = this.payload.steps[0];
      this.activeOptionIndex = findFirstSelectableOptionIndex(firstStep.options, new Set());
      return;
    }

    this.progressiveSelectedIds = new Set();
    this.upfrontAnswers = {};
    this.currentStepIndex = 0;
    this.activeOptionIndex = 0;
  }

  private isUpfrontMode(payload: SerializableQuestionFlow): payload is SerializableUpfrontMode {
    return "steps" in payload;
  }

  private isProgressiveMode(payload: SerializableQuestionFlow): payload is SerializableProgressiveMode {
    return "step" in payload;
  }

  private isTransitioning(): boolean {
    return this.exitingStepState !== null && this.transitionDirection !== null;
  }

  private currentUpfrontStep(): SerializableUpfrontMode["steps"][number] {
    if (!this.isUpfrontMode(this.payload)) {
      throw new Error("Expected upfront question-flow payload.");
    }

    return this.payload.steps[this.currentStepIndex];
  }

  private selectedIdsForCurrentMode(): Set<string> {
    if (this.isProgressiveMode(this.payload)) {
      return this.progressiveSelectedIds;
    }

    if (this.isUpfrontMode(this.payload)) {
      const step = this.currentUpfrontStep();
      return new Set(this.upfrontAnswers[step.id] ?? []);
    }

    return new Set();
  }

  private selectionModeForCurrentMode(): QuestionFlowSelectionMode {
    if (this.isProgressiveMode(this.payload)) {
      return this.payload.selectionMode ?? "single";
    }

    if (this.isUpfrontMode(this.payload)) {
      return this.currentUpfrontStep().selectionMode ?? "single";
    }

    return "single";
  }

  private optionsForCurrentMode(): QuestionFlowOption[] {
    if (this.isProgressiveMode(this.payload)) {
      return this.payload.options;
    }

    if (this.isUpfrontMode(this.payload)) {
      return this.currentUpfrontStep().options;
    }

    return [];
  }

  private buildCurrentStepState(): StepRenderState {
    if (this.isProgressiveMode(this.payload)) {
      return {
        stepNumber: this.payload.step,
        stepKey: `${this.payload.id}-progressive-${this.payload.step}`,
        title: this.payload.title,
        description: this.payload.description,
        options: this.payload.options,
        selectionMode: this.payload.selectionMode ?? "single",
        selectedIds: this.progressiveSelectedIds,
      };
    }

    if (this.isUpfrontMode(this.payload)) {
      const step = this.currentUpfrontStep();
      return {
        stepNumber: this.currentStepIndex + 1,
        stepKey: step.id,
        title: step.title,
        description: step.description,
        options: step.options,
        selectionMode: step.selectionMode ?? "single",
        selectedIds: new Set(this.upfrontAnswers[step.id] ?? []),
      };
    }

    throw new Error("Expected progressive or upfront question-flow payload.");
  }

  private buildUpfrontStepState(stepIndex: number): StepRenderState {
    if (!this.isUpfrontMode(this.payload)) {
      throw new Error("Expected upfront question-flow payload.");
    }

    const step = this.payload.steps[stepIndex];
    return {
      stepNumber: stepIndex + 1,
      stepKey: step.id,
      title: step.title,
      description: step.description,
      options: step.options,
      selectionMode: step.selectionMode ?? "single",
      selectedIds: new Set(this.upfrontAnswers[step.id] ?? []),
    };
  }

  private toggleOption(optionId: string): void {
    const selectionMode = this.selectionModeForCurrentMode();

    if (this.isProgressiveMode(this.payload)) {
      const next = new Set(this.progressiveSelectedIds);
      if (selectionMode === "single") {
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.clear();
          next.add(optionId);
        }
      } else if (next.has(optionId)) {
        next.delete(optionId);
      } else {
        next.add(optionId);
      }

      this.progressiveSelectedIds = next;
      return;
    }

    if (this.isUpfrontMode(this.payload)) {
      const step = this.currentUpfrontStep();
      const current = new Set(this.upfrontAnswers[step.id] ?? []);
      if (selectionMode === "single") {
        if (current.has(optionId)) {
          current.delete(optionId);
        } else {
          current.clear();
          current.add(optionId);
        }
      } else if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }

      this.upfrontAnswers = {
        ...this.upfrontAnswers,
        [step.id]: Array.from(current),
      };
    }
  }

  private emitSelectEvent(payload: { step: number; optionIds: string[] }): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:question-flow-select", {
        detail: payload,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private emitStepChangeEvent(stepId: string, step: number): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:question-flow-step-change", {
        detail: { stepId, step },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private emitCompleteEvent(answers: Record<string, string[]>): void {
    this.dispatchEvent(
      new CustomEvent("mini-tool:question-flow-complete", {
        detail: { answers },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private transitionToUpfrontStep(nextIndex: number, direction: TransitionDirection): void {
    const currentState = this.buildUpfrontStepState(this.currentStepIndex);
    this.exitingStepState = currentState;
    this.transitionDirection = direction;

    this.currentStepIndex = nextIndex;
    const nextState = this.buildUpfrontStepState(nextIndex);
    this.activeOptionIndex = findFirstSelectableOptionIndex(nextState.options, nextState.selectedIds);

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }

    this.transitionTimer = setTimeout(() => {
      this.exitingStepState = null;
      this.transitionDirection = null;
      this.transitionTimer = null;
    }, 260);
  }

  private handleBack(): void {
    if (this.isTransitioning()) {
      return;
    }

    if (this.isProgressiveMode(this.payload)) {
      this.dispatchEvent(
        new CustomEvent("mini-tool:question-flow-back", {
          detail: { step: this.payload.step },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    if (!this.isUpfrontMode(this.payload) || this.currentStepIndex === 0) {
      return;
    }

    const previousIndex = this.currentStepIndex - 1;
    this.transitionToUpfrontStep(previousIndex, "backward");

    const step = this.payload.steps[previousIndex];
    this.emitStepChangeEvent(step.id, previousIndex + 1);
  }

  private handleNext(): void {
    if (this.isTransitioning()) {
      return;
    }

    const selectedIds = Array.from(this.selectedIdsForCurrentMode());
    if (selectedIds.length === 0) {
      return;
    }

    if (this.isProgressiveMode(this.payload)) {
      this.emitSelectEvent({ step: this.payload.step, optionIds: selectedIds });
      return;
    }

    if (!this.isUpfrontMode(this.payload)) {
      return;
    }

    const completedStepNumber = this.currentStepIndex + 1;
    this.emitSelectEvent({ step: completedStepNumber, optionIds: selectedIds });

    const isLastStep = this.currentStepIndex === this.payload.steps.length - 1;
    if (isLastStep) {
      this.emitCompleteEvent(this.upfrontAnswers);
      return;
    }

    const nextIndex = this.currentStepIndex + 1;
    this.transitionToUpfrontStep(nextIndex, "forward");

    const step = this.payload.steps[nextIndex];
    this.emitStepChangeEvent(step.id, nextIndex + 1);
  }

  private handleListboxKeydown(event: KeyboardEvent): void {
    if (this.isTransitioning()) {
      return;
    }

    const options = this.optionsForCurrentMode();
    if (options.length === 0) {
      return;
    }

    const findNextEnabled = (start: number, direction: 1 | -1): number => {
      for (let step = 1; step <= options.length; step += 1) {
        const nextIndex = (start + direction * step + options.length) % options.length;
        if (!options[nextIndex].disabled) {
          return nextIndex;
        }
      }

      return start;
    };

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.activeOptionIndex = findNextEnabled(this.activeOptionIndex, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeOptionIndex = findNextEnabled(this.activeOptionIndex, -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      this.activeOptionIndex = findFirstSelectableOptionIndex(options, new Set());
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const fromEnd = [...options].reverse().findIndex((option) => !option.disabled);
      this.activeOptionIndex = fromEnd < 0 ? 0 : options.length - 1 - fromEnd;
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const activeOption = options[this.activeOptionIndex];
      if (!activeOption || activeOption.disabled) {
        return;
      }

      this.toggleOption(activeOption.id);
    }
  }

  private renderStepBody(
    state: StepRenderState,
    options: { phase: "current" | "exiting"; direction?: TransitionDirection },
  ) {
    const selectedIds = state.selectedIds;
    const direction = options.direction;
    const bodyClasses = ["step-body", options.phase];

    if (options.phase === "current" && direction) {
      bodyClasses.push(direction === "forward" ? "enter-forward" : "enter-backward");
    }

    if (options.phase === "exiting" && direction) {
      bodyClasses.push(direction === "forward" ? "exit-forward" : "exit-backward");
    }

    return html`
      <div class=${bodyClasses.join(" ")} aria-hidden=${options.phase === "exiting" ? "true" : "false"}>
        <h3 class="title">${state.title}</h3>
        ${state.description ? html`<p class="description">${state.description}</p>` : nothing}

        <div class="options" role="listbox" aria-multiselectable=${String(state.selectionMode === "multi")} @keydown=${this.handleListboxKeydown}>
          ${state.options.map((option, index) => {
            const isSelected = selectedIds.has(option.id);
            const isDisabled = Boolean(option.disabled) || options.phase === "exiting" || this.isTransitioning();

            return html`
              <button
                class="option"
                role="option"
                type="button"
                data-id=${option.id}
                aria-selected=${String(isSelected)}
                ?disabled=${isDisabled}
                tabindex=${index === this.activeOptionIndex && options.phase === "current" ? "0" : "-1"}
                @focus=${() => {
                  if (options.phase === "current") {
                    this.activeOptionIndex = index;
                  }
                }}
                @click=${() => {
                  if (options.phase === "current") {
                    this.toggleOption(option.id);
                  }
                }}
              >
                <span class=${`indicator ${state.selectionMode} ${isSelected ? "selected" : ""}`}></span>
                <span class="copy">
                  <span class="option-label">${option.label}</span>
                  ${option.description ? html`<span class="option-description">${option.description}</span>` : nothing}
                </span>
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderReceipt() {
    if (!this.payload || this.isProgressiveMode(this.payload) || this.isUpfrontMode(this.payload)) {
      return nothing;
    }

    return html`
      <article
        class="receipt"
        data-slot="question-flow"
        data-mini-tool-id=${this.payload.id}
        data-role=${this.payload.role ?? nothing}
        data-receipt="true"
      >
        <div class="receipt-card">
          <header class="receipt-header">
            <h3 class="receipt-title">${this.payload.choice.title}</h3>
            <span class="complete-pill">
              <span class="complete-icon" aria-hidden="true">✓</span>
              <span>Complete</span>
            </span>
          </header>
          <div class="summary">
            ${this.payload.choice.summary.map((item, index) => {
              return html`${
                index > 0
                  ? html`
                      <div class="summary-separator" role="separator" aria-hidden="true"></div>
                    `
                  : nothing
              }
              <div class="summary-item">
                <div class="summary-label">${item.label}</div>
                <div class="summary-value">${item.value}</div>
              </div>`;
            })}
          </div>
        </div>
      </article>
    `;
  }

  private renderFlow() {
    if (!this.payload || (!this.isProgressiveMode(this.payload) && !this.isUpfrontMode(this.payload))) {
      return nothing;
    }

    const currentState = this.buildCurrentStepState();
    const totalSteps = this.isUpfrontMode(this.payload) ? this.payload.steps.length : undefined;
    const canProceed = currentState.selectedIds.size > 0;
    const isLastStep = this.isUpfrontMode(this.payload) && this.currentStepIndex === this.payload.steps.length - 1;
    const transitioning = this.isTransitioning();

    return html`
      <article
        class="root"
        data-slot="question-flow"
        data-mini-tool-id=${this.payload.id}
        data-role=${this.payload.role ?? nothing}
      >
        <div class="step-indicator">
          ${totalSteps ? `Step ${currentState.stepNumber} of ${totalSteps}` : `Step ${currentState.stepNumber}`}
        </div>
        ${
          totalSteps
            ? html`<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax=${totalSteps} aria-valuenow=${currentState.stepNumber}>
              ${Array.from({ length: totalSteps }).map((_, index) => {
                return html`<span class=${`segment ${index < currentState.stepNumber ? "done" : ""}`}></span>`;
              })}
            </div>`
            : nothing
        }

        <div class="card-body">
          <div class="step-body-stack">
            ${
              this.exitingStepState && this.transitionDirection
                ? this.renderStepBody(this.exitingStepState, {
                    phase: "exiting",
                    direction: this.transitionDirection,
                  })
                : nothing
            }
            ${this.renderStepBody(currentState, {
              phase: "current",
              direction: this.transitionDirection ?? undefined,
            })}
          </div>

          <footer class="actions">
            ${
              currentState.stepNumber > 1
                ? html`<button
                    class="back-button mt-control-button"
                    type="button"
                    ?disabled=${transitioning}
                    @click=${this.handleBack}
                  >
                    <span class="back-icon" aria-hidden="true">←</span>
                    <span>Back</span>
                  </button>`
                : html`
                    <span></span>
                  `
            }
            <button
              class="next-button mt-control-button"
              type="button"
              ?disabled=${!canProceed || transitioning}
              @click=${this.handleNext}
            >
              ${isLastStep ? "Complete" : "Next"}
            </button>
          </footer>
        </div>
      </article>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    if (this.isProgressiveMode(this.payload) || this.isUpfrontMode(this.payload)) {
      return this.renderFlow();
    }

    return this.renderReceipt();
  }
}
