import { parsePatch, structuredPatch } from "diff";
import { html, LitElement, nothing, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Check, ChevronDown, ChevronUp, Copy } from "lucide";
import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki";
import { renderLucideIcon } from "../../shared/icons/lucide.js";
import pierreDarkTheme from "../../shared/shiki/pierre-dark-theme.js";
import pierreLightTheme from "../../shared/shiki/pierre-light-theme.js";
import { normalizeCodeToTokensResult } from "../../shared/shiki/token-lines.js";
import { getResolvedDocumentTheme, subscribeToDocumentTheme } from "../../shared/theme/document-theme.js";
import stylesText from "./code-diff.css?inline";
import type { SerializableCodeDiff } from "./schema.js";

type DiffRowKind = "context" | "add" | "del" | "meta";

type DiffRow = {
  kind: DiffRowKind;
  text: string;
  leftLine: number | null;
  rightLine: number | null;
};

type SplitDiffRow =
  | {
      kind: "meta";
      text: string;
    }
  | {
      kind: "pair";
      left: DiffRow | null;
      right: DiffRow | null;
    };

type DiffHunk = {
  oldStart: number;
  newStart: number;
  lines: string[];
};

const COPY_TIMEOUT_MS = 1_500;
const MAX_CACHE_ENTRIES = 512;

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  sql: "SQL",
  yaml: "YAML",
  go: "Go",
  rust: "Rust",
  text: "Plain Text",
};

let highlighterPromise: Promise<Highlighter> | null = null;
const highlightedLineCache = new Map<string, string>();

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [pierreDarkTheme as never, pierreLightTheme as never],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  }

  return highlighterPromise;
}

function rememberLineCache(cacheKey: string, htmlValue: string): void {
  if (highlightedLineCache.has(cacheKey)) {
    highlightedLineCache.set(cacheKey, htmlValue);
    return;
  }

  if (highlightedLineCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = highlightedLineCache.keys().next().value;
    if (typeof oldest === "string") {
      highlightedLineCache.delete(oldest);
    }
  }

  highlightedLineCache.set(cacheKey, htmlValue);
}

function getLanguageDisplayName(language: string): string {
  return LANGUAGE_DISPLAY_NAMES[language.toLowerCase()] ?? language.toUpperCase();
}

function getRowsFromHunks(hunks: DiffHunk[]): DiffRow[] {
  const rows: DiffRow[] = [];

  for (const hunk of hunks) {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    for (const line of hunk.lines) {
      if (line.startsWith("\\")) {
        rows.push({
          kind: "meta",
          text: line,
          leftLine: null,
          rightLine: null,
        });
        continue;
      }

      const prefix = line[0] ?? " ";
      const text = line.slice(1);

      if (prefix === " ") {
        rows.push({
          kind: "context",
          text,
          leftLine: oldLine,
          rightLine: newLine,
        });
        oldLine += 1;
        newLine += 1;
        continue;
      }

      if (prefix === "-") {
        rows.push({
          kind: "del",
          text,
          leftLine: oldLine,
          rightLine: null,
        });
        oldLine += 1;
        continue;
      }

      if (prefix === "+") {
        rows.push({
          kind: "add",
          text,
          leftLine: null,
          rightLine: newLine,
        });
        newLine += 1;
      }
    }
  }

  return rows;
}

function buildDiffRows(payload: SerializableCodeDiff): DiffRow[] {
  if (payload.patch) {
    const parsed = parsePatch(payload.patch);
    const rows: DiffRow[] = [];

    for (const file of parsed) {
      if (file.oldFileName || file.newFileName) {
        const fileName = file.newFileName ?? file.oldFileName ?? "file";
        rows.push({ kind: "meta", text: fileName, leftLine: null, rightLine: null });
      }
      rows.push(...getRowsFromHunks(file.hunks));
    }

    return rows;
  }

  const filename = payload.filename ?? "file";
  const patch = structuredPatch(filename, filename, payload.oldCode ?? "", payload.newCode ?? "", "", "", {
    context: Number.MAX_SAFE_INTEGER,
  });

  return getRowsFromHunks(patch.hunks);
}

function buildSplitRows(rows: DiffRow[]): SplitDiffRow[] {
  const splitRows: SplitDiffRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];

    if (current.kind === "meta") {
      splitRows.push({ kind: "meta", text: current.text });
      continue;
    }

    if (current.kind === "context") {
      splitRows.push({ kind: "pair", left: current, right: current });
      continue;
    }

    if (current.kind === "del") {
      const next = rows[index + 1];
      if (next?.kind === "add") {
        splitRows.push({ kind: "pair", left: current, right: next });
        index += 1;
        continue;
      }

      splitRows.push({ kind: "pair", left: current, right: null });
      continue;
    }

    splitRows.push({ kind: "pair", left: null, right: current });
  }

  return splitRows;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

@customElement("mini-tool-code-diff")
export class MiniToolCodeDiff extends LitElement {
  @property({ attribute: false })
  payload!: SerializableCodeDiff;

  @state()
  private rows: DiffRow[] = [];

  @state()
  private highlightedLinesLight: string[] = [];

  @state()
  private highlightedLinesDark: string[] = [];

  @state()
  private additions = 0;

  @state()
  private deletions = 0;

  @state()
  private isCopied = false;

  @state()
  private expanded = false;

  @state()
  private resolvedTheme: "light" | "dark" = getResolvedDocumentTheme();

  static styles = unsafeCSS(stylesText);

  private unsubscribeFromTheme: (() => void) | null = null;
  private copyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private renderRequestId = 0;

  connectedCallback(): void {
    super.connectedCallback();

    this.unsubscribeFromTheme = subscribeToDocumentTheme((theme) => {
      this.resolvedTheme = theme;
    });
  }

  disconnectedCallback(): void {
    this.unsubscribeFromTheme?.();
    this.unsubscribeFromTheme = null;

    if (this.copyTimeoutHandle) {
      clearTimeout(this.copyTimeoutHandle);
    }

    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has("payload") || !this.payload) {
      return;
    }

    this.rows = buildDiffRows(this.payload);
    this.additions = this.rows.filter((row) => row.kind === "add").length;
    this.deletions = this.rows.filter((row) => row.kind === "del").length;
    if (this.payload.maxCollapsedLines === undefined) {
      this.expanded = true;
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("payload") || changed.has("rows")) {
      void this.highlightRows();
    }

    if (changed.has("payload")) {
      this.resetHorizontalScroll();
    }
  }

  private shouldCollapse(): boolean {
    if (!this.payload.maxCollapsedLines) {
      return false;
    }

    return this.rows.length > this.payload.maxCollapsedLines;
  }

  private isCollapsed(): boolean {
    return this.shouldCollapse() && !this.expanded;
  }

  private collapseHeightStyle(): string {
    const maxLines = this.payload.maxCollapsedLines ?? 0;
    if (maxLines <= 0) {
      return "";
    }

    const lineHeightPx = 22;
    const maxHeight = Math.round(maxLines * lineHeightPx + 16);
    return `--collapse-height:${maxHeight}px;`;
  }

  private async renderHighlightedLine(text: string, theme: "pierre-light" | "pierre-dark"): Promise<string> {
    const language = this.payload.language;
    const cacheKey = `${theme}::${language}::${text}`;
    const cached = highlightedLineCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const highlighter = await getHighlighter();
      const loadedLanguages = highlighter.getLoadedLanguages().map((lang) => String(lang));
      const languageForLoad = language as Parameters<Highlighter["loadLanguage"]>[0];
      const languageForTokens = language as Parameters<Highlighter["codeToTokens"]>[1]["lang"];

      if (!loadedLanguages.includes(language)) {
        await highlighter.loadLanguage(languageForLoad);
      }

      const tokenResult = highlighter.codeToTokens(text.length > 0 ? text : " ", {
        lang: languageForTokens,
        theme,
      });

      const tokenLines = normalizeCodeToTokensResult(tokenResult);
      const firstLine = tokenLines[0] ?? [];
      const highlighted = firstLine
        .map((token: { content: string; color?: string; fontStyle?: number }) => {
          const escapedContent = escapeHtml(token.content);
          const styleParts: string[] = [];

          if (token.color) {
            styleParts.push(`color:${token.color}`);
          }

          if (token.fontStyle !== undefined) {
            if ((token.fontStyle & 1) === 1) {
              styleParts.push("font-style:italic");
            }
            if ((token.fontStyle & 2) === 2) {
              styleParts.push("font-weight:700");
            }
            if ((token.fontStyle & 4) === 4) {
              styleParts.push("text-decoration:underline");
            }
          }

          if (styleParts.length === 0) {
            return `<span>${escapedContent}</span>`;
          }

          return `<span style="${styleParts.join(";")}">${escapedContent}</span>`;
        })
        .join("");

      const fallbackHighlighted = highlighted.length > 0 ? highlighted : escapeHtml(text);
      rememberLineCache(cacheKey, fallbackHighlighted);
      return fallbackHighlighted;
    } catch {
      return escapeHtml(text);
    }
  }

  private async highlightRowsForTheme(theme: "pierre-light" | "pierre-dark"): Promise<string[]> {
    return Promise.all(this.rows.map((row) => this.renderHighlightedLine(row.text, theme)));
  }

  private async highlightRows(): Promise<void> {
    const requestId = ++this.renderRequestId;
    const [lightLines, darkLines] = await Promise.all([
      this.highlightRowsForTheme("pierre-light"),
      this.highlightRowsForTheme("pierre-dark"),
    ]);

    if (requestId !== this.renderRequestId) {
      return;
    }

    this.highlightedLinesLight = lightLines;
    this.highlightedLinesDark = darkLines;
  }

  private copyableCode(): string {
    if (this.payload.patch) {
      return this.payload.patch;
    }

    return this.payload.newCode ?? this.payload.oldCode ?? "";
  }

  private async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.copyableCode());
    } catch {
      return;
    }

    this.isCopied = true;
    if (this.copyTimeoutHandle) {
      clearTimeout(this.copyTimeoutHandle);
    }

    this.copyTimeoutHandle = setTimeout(() => {
      this.isCopied = false;
    }, COPY_TIMEOUT_MS);
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private resetHorizontalScroll(): void {
    queueMicrotask(() => {
      const content = this.renderRoot.querySelector<HTMLElement>(".content");
      if (content) {
        content.scrollLeft = 0;
      }

      const panes = this.renderRoot.querySelectorAll<HTMLElement>(".split-pane");
      panes.forEach((pane) => {
        pane.scrollLeft = 0;
      });
    });
  }

  private renderCopyIcon() {
    if (this.isCopied) {
      return renderLucideIcon(Check, { size: 16 });
    }

    return renderLucideIcon(Copy, { size: 16 });
  }

  private renderChevron(up: boolean) {
    if (up) {
      return renderLucideIcon(ChevronUp, { className: "chevron", size: 16 });
    }

    return renderLucideIcon(ChevronDown, { className: "chevron", size: 16 });
  }

  private get activeHighlightedLines(): string[] {
    return this.resolvedTheme === "dark" ? this.highlightedLinesDark : this.highlightedLinesLight;
  }

  private renderUnifiedRows() {
    const showLineNumbers = this.payload.lineNumbers === "visible";
    const highlightedLines = this.activeHighlightedLines;

    return html`
      <div class="unified-rows">
        ${this.rows.map((row, index) => {
          const lineHtml = highlightedLines[index] ?? escapeHtml(row.text);
          const marker = row.kind === "add" ? "+" : row.kind === "del" ? "-" : "";

          return html`
            <div class=${`line ${row.kind} ${showLineNumbers ? "" : "no-line-numbers"}`}>
              <span class=${`line-sign ${row.kind}`}>${marker}</span>
              ${
                showLineNumbers
                  ? html`<span class="line-no left">${row.leftLine ?? ""}</span>
                      <span class="line-no right">${row.rightLine ?? ""}</span>`
                  : nothing
              }
              <span class="line-code">${unsafeHTML(lineHtml)}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderSplitPaneRow(side: DiffRow | null, highlightedHtml: string | null, pane: "left" | "right") {
    const showLineNumbers = this.payload.lineNumbers === "visible";

    if (!side) {
      return html`
        <div class=${`split-pane-row empty ${showLineNumbers ? "" : "no-line-numbers"}`}>
          ${
            showLineNumbers
              ? html`
                  <span class="line-no" aria-hidden="true">&nbsp;</span>
                `
              : nothing
          }
          <span class="line-code placeholder" aria-hidden="true">&nbsp;</span>
        </div>
      `;
    }

    const lineNumber = pane === "left" ? side.leftLine : side.rightLine;

    return html`
      <div class=${`split-pane-row ${side.kind} ${showLineNumbers ? "" : "no-line-numbers"}`}>
        ${showLineNumbers ? html`<span class="line-no">${lineNumber ?? ""}</span>` : nothing}
        <span class="line-code">${unsafeHTML(highlightedHtml ?? escapeHtml(side.text))}</span>
      </div>
    `;
  }

  private renderSplitRows() {
    const splitRows = buildSplitRows(this.rows);
    const rowIndexMap = new Map(this.rows.map((row, index) => [row, index]));
    const highlightedLines = this.activeHighlightedLines;

    const leftRows = splitRows.map((row) => {
      if (row.kind === "meta") {
        return html`<div class="split-pane-meta">${row.text}</div>`;
      }

      const leftIndex = row.left ? (rowIndexMap.get(row.left) ?? -1) : -1;
      const leftHtml = leftIndex >= 0 ? (highlightedLines[leftIndex] ?? null) : null;
      return this.renderSplitPaneRow(row.left, leftHtml, "left");
    });

    const rightRows = splitRows.map((row) => {
      if (row.kind === "meta") {
        return html`<div class="split-pane-meta">${row.text}</div>`;
      }

      const rightIndex = row.right ? (rowIndexMap.get(row.right) ?? -1) : -1;
      const rightHtml = rightIndex >= 0 ? (highlightedLines[rightIndex] ?? null) : null;
      return this.renderSplitPaneRow(row.right, rightHtml, "right");
    });

    return html`
      <div class="split-grid">
        <div class="split-pane left">
          <div class="split-pane-content">${leftRows}</div>
        </div>
        <div class="split-pane right">
          <div class="split-pane-content">${rightRows}</div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.payload) {
      return nothing;
    }

    const collapsed = this.isCollapsed();
    const showToggle = this.shouldCollapse();
    const language = getLanguageDisplayName(this.payload.language);

    return html`
      <article class="root" data-slot="code-diff" data-mini-tool-id=${this.payload.id}>
        <div class="shell">
          <header class="header">
            <div class="meta">
              <span class="language">${language}</span>
              ${
                this.payload.filename
                  ? html`<span class="separator">•</span><span class="filename">${this.payload.filename}</span>`
                  : nothing
              }
            </div>

            ${
              this.additions > 0 || this.deletions > 0
                ? html`<span class="summary"><span class="add">+${this.additions}</span> <span class="del">-${
                    this.deletions
                  }</span></span>`
                : nothing
            }

            <button
              type="button"
              class=${`copy ${this.isCopied ? "success" : ""}`}
              aria-label=${this.isCopied ? "Copied" : "Copy code"}
              @click=${this.copyCode}
            >
              ${this.renderCopyIcon()}
            </button>
          </header>

          <div
            class=${`content ${this.payload.diffStyle === "split" ? "split" : "unified"} ${collapsed ? "collapsed" : ""}`}
            style=${this.collapseHeightStyle()}
          >
            ${this.payload.diffStyle === "split" ? this.renderSplitRows() : this.renderUnifiedRows()}
          </div>

          ${
            showToggle
              ? html`<button class="toggle" type="button" @click=${this.toggleExpanded}>
                ${
                  collapsed
                    ? html`${this.renderChevron(false)} <span>Show full diff</span>`
                    : html`${this.renderChevron(true)} <span>Collapse</span>`
                }
              </button>`
              : nothing
          }
        </div>
      </article>
    `;
  }
}
