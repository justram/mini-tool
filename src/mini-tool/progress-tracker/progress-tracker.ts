import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Clock3 } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import stylesText from "./progress-tracker.css?inline";
import type { ProgressStep, ProgressTrackerChoice, SerializableProgressTracker } from "./schema.js";

function formatElapsedTime(milliseconds: number): string {
  const roundedSeconds = Math.round(Math.max(0, milliseconds) / 100) / 10;

  if (roundedSeconds < 60) {
    return `${roundedSeconds.toFixed(1)}s`;
  }

  const wholeSeconds = Math.floor(roundedSeconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatElapsedTimeDateTime(milliseconds: number): string {
  const roundedSeconds = Math.round(Math.max(0, milliseconds) / 100) / 10;

  if (roundedSeconds < 60) {
    return `PT${Number(roundedSeconds.toFixed(1))}S`;
  }

  const wholeSeconds = Math.floor(roundedSeconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  const hourPart = hours > 0 ? `${hours}H` : "";
  const minutePart = minutes > 0 ? `${minutes}M` : "";
  const secondPart = seconds > 0 ? `${seconds}S` : "";

  if (!hourPart && !minutePart && !secondPart) {
    return "PT0S";
  }

  return `PT${hourPart}${minutePart}${secondPart}`;
}

function getCurrentStepId(steps: ProgressStep[]): string | null {
  const inProgress = steps.find((step) => step.status === "in-progress");
  if (inProgress) {
    return inProgress.id;
  }

  const failed = steps.find((step) => step.status === "failed");
  if (failed) {
    return failed.id;
  }

  const pending = steps.find((step) => step.status === "pending");
  return pending?.id ?? null;
}

function receiptTone(outcome: ProgressTrackerChoice["outcome"]): { icon: string; tone: string } {
  switch (outcome) {
    case "success":
      return { icon: "✓", tone: "tone-success" };
    case "partial":
      return { icon: "!", tone: "tone-warn" };
    case "failed":
      return { icon: "!", tone: "tone-failed" };
    case "cancelled":
      return { icon: "×", tone: "tone-muted" };
  }
}

@customElement("mini-tool-progress-tracker")
export class MiniToolProgressTracker extends LitElement {
  @property({ attribute: false })
  payload!: SerializableProgressTracker;

  static styles = unsafeCSS(stylesText);

  private renderElapsedTime(elapsedTime?: number) {
    if (elapsedTime === undefined || elapsedTime <= 0) {
      return nothing;
    }

    return html`<div class="timer">
      ${renderLucideIcon(Clock3, { className: "timer-icon", size: 16 })}
      <time dateTime=${formatElapsedTimeDateTime(elapsedTime)}>${formatElapsedTime(elapsedTime)}</time>
    </div>`;
  }

  private renderMarker(status: ProgressStep["status"]) {
    if (status === "in-progress") {
      return html`
        <span class="marker in-progress" aria-hidden="true"><span class="spinner" aria-hidden="true"></span></span>
      `;
    }

    if (status === "completed") {
      return html`
        <span class="marker completed" aria-hidden="true">✓</span>
      `;
    }

    if (status === "failed") {
      return html`
        <span class="marker failed" aria-hidden="true">×</span>
      `;
    }

    return html`
      <span class="marker pending" aria-hidden="true">•</span>
    `;
  }

  private renderStep(step: ProgressStep, currentStepId: string | null, hasConnector: boolean) {
    const isCurrent = step.id === currentStepId;
    const shouldShowDescription = step.status === "in-progress" || step.status === "failed";

    return html`<li
      class=${`step ${isCurrent ? "current" : ""} ${hasConnector ? "has-connector" : ""} ${shouldShowDescription && step.description ? "has-description" : ""}`}
      aria-current=${isCurrent ? "step" : nothing}
    >
      ${this.renderMarker(step.status)}
      <div>
        <div class=${`label ${step.status === "pending" ? "pending" : ""}`}>${step.label}</div>
        ${
          step.description && shouldShowDescription ? html`<div class="description">${step.description}</div>` : nothing
        }
      </div>
    </li>`;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    if (this.payload.choice) {
      const state = receiptTone(this.payload.choice.outcome);
      return html`<div
        class="card"
        data-slot="progress-tracker"
        data-mini-tool-id=${this.payload.id}
        data-receipt="true"
        role="status"
        aria-label=${this.payload.choice.summary}
      >
        <div class="receipt-header">
          ${this.renderElapsedTime(this.payload.elapsedTime)}
          <span class=${`receipt-summary ${state.tone}`}>
            <span>${state.icon}</span>
            <span>${this.payload.choice.summary}</span>
          </span>
        </div>
        <ol>
          ${this.payload.steps.map((step, index) => {
            return this.renderStep(step, null, index < this.payload.steps.length - 1);
          })}
        </ol>
      </div>`;
    }

    const hasInProgress = this.payload.steps.some((step) => step.status === "in-progress");
    const currentStepId = getCurrentStepId(this.payload.steps);

    return html`<article
      class="card"
      data-slot="progress-tracker"
      data-mini-tool-id=${this.payload.id}
      role="status"
      aria-live="polite"
      aria-busy=${String(hasInProgress)}
    >
      ${this.renderElapsedTime(this.payload.elapsedTime)}
      <ol>
        ${this.payload.steps.map((step, index) => {
          return this.renderStep(step, currentStepId, index < this.payload.steps.length - 1);
        })}
      </ol>
    </article>`;
  }
}
