import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Check, ChevronDown, ChevronUp, Copy, Terminal as TerminalIcon } from "lucide";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import type { SerializableTerminal } from "./schema.js";
import stylesText from "./terminal.css?inline";

type AnsiState = {
  color: string | null;
  bold: boolean;
};

type StyledSegment = {
  text: string;
  className: string;
};

const COPY_TIMEOUT_MS = 1_500;
const ANSI_COLOR_CLASS: Record<number, string> = {
  30: "ansi-black",
  31: "ansi-red",
  32: "ansi-green",
  33: "ansi-yellow",
  34: "ansi-blue",
  35: "ansi-magenta",
  36: "ansi-cyan",
  37: "ansi-white",
  90: "ansi-bright-black",
  91: "ansi-bright-red",
  92: "ansi-bright-green",
  93: "ansi-bright-yellow",
  94: "ansi-bright-blue",
  95: "ansi-bright-magenta",
  96: "ansi-bright-cyan",
  97: "ansi-bright-white",
};

function formatDuration(durationMs?: number): string | null {
  if (durationMs == null) {
    return null;
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function countOutputLines(output: string): number {
  const trimmedTrailingNewlines = output.replace(/\n+$/, "");
  if (!trimmedTrailingNewlines) {
    return 0;
  }

  return trimmedTrailingNewlines.split("\n").length;
}

function stateToClassName(state: AnsiState): string {
  const classes: string[] = [];

  if (state.color) {
    classes.push(state.color);
  }

  if (state.bold) {
    classes.push("ansi-bold");
  }

  return classes.join(" ");
}

function pushSegment(segments: StyledSegment[], text: string, state: AnsiState): void {
  if (!text) {
    return;
  }

  segments.push({
    text,
    className: stateToClassName(state),
  });
}

function parseAnsiToSegments(input: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  const sequenceRegex = /\u001b\[([0-9;]*)m/g;
  let cursor = 0;
  let state: AnsiState = { color: null, bold: false };

  for (const match of input.matchAll(sequenceRegex)) {
    const full = match[0];
    const index = match.index ?? 0;
    pushSegment(segments, input.slice(cursor, index), state);

    const codeList = match[1] ? match[1].split(";").map((entry) => Number(entry || "0")) : [0];

    for (const code of codeList) {
      if (!Number.isFinite(code)) {
        continue;
      }

      if (code === 0) {
        state = { color: null, bold: false };
        continue;
      }

      if (code === 1) {
        state = { ...state, bold: true };
        continue;
      }

      if (code === 22) {
        state = { ...state, bold: false };
        continue;
      }

      if (code === 39) {
        state = { ...state, color: null };
        continue;
      }

      const colorClass = ANSI_COLOR_CLASS[code];
      if (colorClass) {
        state = { ...state, color: colorClass };
      }
    }

    cursor = index + full.length;
  }

  pushSegment(segments, input.slice(cursor), state);
  return segments;
}

@customElement("mini-tool-terminal")
export class MiniToolTerminal extends LitElement {
  @property({ attribute: false })
  payload!: SerializableTerminal;

  @state()
  private isExpanded = false;

  @state()
  private copied = false;

  static styles = unsafeCSS(stylesText);

  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  disconnectedCallback(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
    super.disconnectedCallback();
  }

  private async handleCopy(): Promise<void> {
    const output = this.buildOutput();
    if (!output) {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(output);
      this.copied = true;
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = setTimeout(() => {
        this.copied = false;
      }, COPY_TIMEOUT_MS);
    }
  }

  private toggleCollapsed(): void {
    this.isExpanded = !this.isExpanded;
  }

  private buildOutput(): string {
    const chunks = [this.payload.stdout, this.payload.stderr].filter((entry): entry is string => Boolean(entry));
    return chunks.join("\n");
  }

  private renderAnsiBlock(output: string, extraClass?: string) {
    const segments = parseAnsiToSegments(output);

    return html`<pre class=${`output-block${extraClass ? ` ${extraClass}` : ""}`}>${segments.map((segment) =>
      segment.className ? html`<span class=${segment.className}>${segment.text}</span>` : html`${segment.text}`,
    )}</pre>`;
  }

  render() {
    const payload = this.payload;
    if (!payload) {
      return nothing;
    }

    const hasOutput = Boolean(payload.stdout || payload.stderr);
    const output = this.buildOutput();
    const lineCount = countOutputLines(output);
    const shouldCollapse = payload.maxCollapsedLines !== undefined && lineCount > payload.maxCollapsedLines;
    const isCollapsed = shouldCollapse && !this.isExpanded;
    const formattedDuration = formatDuration(payload.durationMs);

    return html`
      <article class="root" data-slot="terminal" data-mini-tool-id=${payload.id}>
        <section class="shell">
          <header class="header">
            <div class="command-wrap">
              ${renderLucideIcon(TerminalIcon, { className: "terminal-icon", size: 16 })}
              <p class="command-line">
                ${payload.cwd ? html`<span class="cwd">${payload.cwd}$ </span>` : nothing}${payload.command}
              </p>
            </div>
            <div class="meta">
              ${formattedDuration ? html`<span class="duration">${formattedDuration}</span>` : nothing}
              <span class=${`exit-code${payload.exitCode === 0 ? "" : " error"}`}>${payload.exitCode}</span>
              <button
                type="button"
                class="icon-button"
                @click=${this.handleCopy}
                ?disabled=${!hasOutput}
                aria-label=${!hasOutput ? "No output to copy" : this.copied ? "Copied" : "Copy output"}
              >
                ${
                  this.copied
                    ? renderLucideIcon(Check, { className: "copy-icon", size: 16 })
                    : renderLucideIcon(Copy, { className: "copy-icon", size: 16 })
                }
              </button>
            </div>
          </header>

          ${
            hasOutput
              ? html`<div class=${`output-region${isCollapsed ? " collapsed" : ""}`}>
                <div class="output-body">
                  ${payload.stdout ? this.renderAnsiBlock(payload.stdout) : nothing}
                  ${payload.stderr ? this.renderAnsiBlock(payload.stderr, "stderr") : nothing}
                  ${
                    payload.truncated
                      ? html`
                          <p class="truncated">Output truncated...</p>
                        `
                      : nothing
                  }
                </div>
                ${
                  isCollapsed
                    ? html`
                        <div class="collapse-fade"></div>
                      `
                    : nothing
                }
              </div>`
              : html`
                  <p class="empty">No output</p>
                `
          }

          ${
            shouldCollapse
              ? html`<button type="button" class="toggle" @click=${this.toggleCollapsed}>
                ${
                  isCollapsed
                    ? html`${renderLucideIcon(ChevronDown, {
                        className: "toggle-icon",
                        size: 16,
                      })}
                      Show all ${lineCount} lines`
                    : html`${renderLucideIcon(ChevronUp, { className: "toggle-icon", size: 16 })}
                      Collapse`
                }
              </button>`
              : nothing
          }
        </section>
      </article>
    `;
  }
}
