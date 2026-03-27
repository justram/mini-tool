import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import stylesText from "./plan.css?inline";
import type { PlanTodo, PlanTodoStatus, SerializablePlan } from "./schema.js";

const INITIAL_VISIBLE_TODO_COUNT = 4;

type PlanVariant = "default" | "compact";

function statusIcon(status: PlanTodoStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "cancelled":
      return "×";
    case "in_progress":
      return "↻";
    case "pending":
      return "•";
  }
}

function progressPercent(todos: PlanTodo[]): number {
  const total = todos.length;
  if (total === 0) {
    return 0;
  }

  const completed = todos.filter((todo) => todo.status === "completed").length;
  return Math.round((completed / total) * 100);
}

@customElement("mini-tool-plan")
export class MiniToolPlan extends LitElement {
  @property({ attribute: false })
  payload!: SerializablePlan;

  @property({ reflect: true })
  variant: PlanVariant = "default";

  @state()
  private expandedTodoIds = new Set<string>();

  @state()
  private showHiddenTodos = false;

  static styles = unsafeCSS(stylesText);

  private toggleTodoDescription(todoId: string): void {
    const next = new Set(this.expandedTodoIds);
    if (next.has(todoId)) {
      next.delete(todoId);
    } else {
      next.add(todoId);
    }

    this.expandedTodoIds = next;
  }

  private renderTodo(todo: PlanTodo) {
    const hasDescription = Boolean(todo.description && todo.description.length > 0);
    const isExpanded = this.expandedTodoIds.has(todo.id);

    return html`<li class="todo">
      <button
        class=${`todo-row ${hasDescription ? "has-description" : ""}`}
        type="button"
        aria-expanded=${hasDescription ? String(isExpanded) : "false"}
        @click=${() => {
          if (!hasDescription) {
            return;
          }

          this.toggleTodoDescription(todo.id);
        }}
      >
        <span class=${`icon ${todo.status}`} aria-hidden="true">${statusIcon(todo.status)}</span>
        <span class=${`todo-label ${todo.status === "pending" ? "pending" : ""}`}>${todo.label}</span>
        ${hasDescription ? html`<span class="chevron" aria-hidden="true">${isExpanded ? "▼" : "▶"}</span>` : nothing}
      </button>
      ${hasDescription && isExpanded ? html`<p class="todo-description">${todo.description}</p>` : nothing}
    </li>`;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const compact = this.variant === "compact";
    const visibleCount = this.payload.maxVisibleTodos ?? INITIAL_VISIBLE_TODO_COUNT;
    const visibleTodos = this.payload.todos.slice(0, visibleCount);
    const hiddenTodos = this.payload.todos.slice(visibleCount);
    const completed = this.payload.todos.filter((todo) => todo.status === "completed").length;
    const allComplete = completed === this.payload.todos.length;
    const progress = progressPercent(this.payload.todos);

    return html`<article
      class=${`root ${compact ? "compact" : ""}`}
      data-slot="plan"
      data-mini-tool-id=${this.payload.id}
      data-role=${this.payload.role ?? nothing}
    >
      <header class="header">
        <div>
          <h3 class="title">${this.payload.title}</h3>
          ${this.payload.description ? html`<p class="description">${this.payload.description}</p>` : nothing}
        </div>
        ${
          allComplete
            ? html`
                <span class="checkmark" aria-hidden="true">✓</span>
              `
            : nothing
        }
      </header>

      <section class="summary" aria-label="Progress summary">
        <div class="progress-label">${completed} of ${this.payload.todos.length} complete</div>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${progress}>
          <div class=${`progress-fill ${progress === 100 ? "complete" : ""}`} style=${`width:${progress}%`}></div>
        </div>
      </section>

      <ul class="todo-list">
        ${visibleTodos.map((todo) => {
          return this.renderTodo(todo);
        })}
      </ul>

      ${
        hiddenTodos.length > 0
          ? html`<section>
            <button
              class="more-toggle"
              type="button"
              aria-expanded=${String(this.showHiddenTodos)}
              @click=${() => {
                this.showHiddenTodos = !this.showHiddenTodos;
              }}
            >
              ${this.showHiddenTodos ? "Hide" : `${hiddenTodos.length} more`}
            </button>
            ${
              this.showHiddenTodos
                ? html`<ul class="hidden-list">
                  ${hiddenTodos.map((todo) => {
                    return this.renderTodo(todo);
                  })}
                </ul>`
                : nothing
            }
          </section>`
          : nothing
      }
    </article>`;
  }
}
