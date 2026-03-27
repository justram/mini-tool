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
import stylesText from "./code-block.css?inline";
import type { CodeBlockLineNumbersMode, SerializableCodeBlock } from "./schema.js";

const COPY_TIMEOUT_MS = 1_500;
const MAX_HTML_CACHE_ENTRIES = 64;

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
const htmlCache = new Map<string, string>();
const tokenShapeCompatibilityCache = new Map<string, boolean>();

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

function setCachedHtml(cacheKey: string, htmlValue: string): void {
  if (htmlCache.has(cacheKey)) {
    htmlCache.set(cacheKey, htmlValue);
    return;
  }

  if (htmlCache.size >= MAX_HTML_CACHE_ENTRIES) {
    const oldestKey = htmlCache.keys().next().value;
    if (typeof oldestKey === "string") {
      htmlCache.delete(oldestKey);
    }
  }

  htmlCache.set(cacheKey, htmlValue);
}

function getCacheKey(
  code: string,
  language: string,
  theme: string,
  lineNumbers: CodeBlockLineNumbersMode,
  highlightLines: number[] | undefined,
): string {
  return JSON.stringify({
    code,
    language,
    theme,
    lineNumbers,
    highlightLines: highlightLines ?? null,
  });
}

function assertTokenShapeCompatibility(highlighter: Highlighter, language: string, theme: string): void {
  const cacheKey = `${language}::${theme}`;
  if (tokenShapeCompatibilityCache.get(cacheKey) === true) {
    return;
  }

  const tokenResult = highlighter.codeToTokens("const __mini_tool_probe__ = 1", {
    lang: language as Parameters<Highlighter["codeToTokens"]>[1]["lang"],
    theme,
  });

  const tokenLines = normalizeCodeToTokensResult(tokenResult);
  if (tokenLines.length === 0) {
    throw new Error("Unsupported Shiki token result shape");
  }

  tokenShapeCompatibilityCache.set(cacheKey, true);
}

function getLanguageDisplayName(language: string): string {
  return LANGUAGE_DISPLAY_NAMES[language.toLowerCase()] ?? language.toUpperCase();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

@customElement("mini-tool-code-block")
export class MiniToolCodeBlock extends LitElement {
  @property({ attribute: false })
  payload!: SerializableCodeBlock;

  @state()
  private highlightedHtmlLight: string | null = null;

  @state()
  private highlightedHtmlDark: string | null = null;

  @state()
  private isCopied = false;

  @state()
  private expanded = false;

  @state()
  private resolvedTheme: "light" | "dark" = getResolvedDocumentTheme();

  static styles = unsafeCSS(stylesText);

  private unsubscribeFromTheme: (() => void) | null = null;
  private copyTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private highlightRequestId = 0;

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

    if (this.payload.maxCollapsedLines === undefined) {
      this.expanded = true;
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("payload")) {
      const payload = this.payload;
      if (payload) {
        void this.highlightCode();
      }
    }
  }

  private getCodeLineCount(): number {
    return this.payload.code.split("\n").length;
  }

  private shouldCollapse(): boolean {
    if (!this.payload.maxCollapsedLines) {
      return false;
    }

    return this.getCodeLineCount() > this.payload.maxCollapsedLines;
  }

  private isCollapsed(): boolean {
    return this.shouldCollapse() && !this.expanded;
  }

  private collapseHeightStyle(): string {
    const maxLines = this.payload.maxCollapsedLines ?? 0;
    if (maxLines <= 0) {
      return "";
    }

    const lineHeightPx = 18.2;
    const verticalPaddingPx = 32;
    const maxHeight = Math.round(maxLines * lineHeightPx + verticalPaddingPx);
    return `--collapse-height:${maxHeight}px;`;
  }

  private async renderHighlightedHtml(theme: "pierre-light" | "pierre-dark"): Promise<string> {
    const payload = this.payload;
    const language = payload.language;
    const lineNumbers = payload.lineNumbers;
    const cacheKey = getCacheKey(payload.code, language, theme, lineNumbers, payload.highlightLines);
    const cached = htmlCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const highlighter = await getHighlighter();
    const loadedLanguages = highlighter.getLoadedLanguages().map((lang) => String(lang));
    if (!loadedLanguages.includes(language)) {
      await highlighter.loadLanguage(language as Parameters<Highlighter["loadLanguage"]>[0]);
    }

    assertTokenShapeCompatibility(highlighter, language, theme);

    const showLineNumbers = lineNumbers === "visible";
    const lineCount = this.getCodeLineCount();
    const lineNumberWidth = `${String(lineCount).length + 0.5}ch`;

    const htmlValue = highlighter.codeToHtml(payload.code, {
      lang: language,
      theme,
      transformers: [
        {
          line(node, line) {
            node.properties["data-line"] = line;
            if (payload.highlightLines?.includes(line)) {
              const background = theme === "pierre-dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)";
              node.properties.style = `background:${background};`;
            }

            if (showLineNumbers) {
              node.children.unshift({
                type: "element",
                tagName: "span",
                properties: {
                  class: "line-number",
                  style: `width:${lineNumberWidth};`,
                  "aria-hidden": "true",
                },
                children: [{ type: "text", value: String(line) }],
              });
            }
          },
        },
      ],
    });

    setCachedHtml(cacheKey, htmlValue);
    return htmlValue;
  }

  private async highlightCode(): Promise<void> {
    const payload = this.payload;
    const requestId = ++this.highlightRequestId;

    try {
      const [lightHtml, darkHtml] = await Promise.all([
        this.renderHighlightedHtml("pierre-light"),
        this.renderHighlightedHtml("pierre-dark"),
      ]);

      if (requestId !== this.highlightRequestId) {
        return;
      }

      this.highlightedHtmlLight = lightHtml;
      this.highlightedHtmlDark = darkHtml;
    } catch {
      if (requestId !== this.highlightRequestId) {
        return;
      }

      const fallback = `<pre class="fallback"><code>${escapeHtml(payload.code)}</code></pre>`;
      this.highlightedHtmlLight = fallback;
      this.highlightedHtmlDark = fallback;
    }
  }

  private async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.payload.code);
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

  render() {
    if (!this.payload) {
      return nothing;
    }

    const language = this.payload.language;
    const showToggle = this.shouldCollapse();
    const collapsed = this.isCollapsed();
    const lineCount = this.getCodeLineCount();
    const highlightedHtml = this.resolvedTheme === "dark" ? this.highlightedHtmlDark : this.highlightedHtmlLight;

    return html`
      <article class="root" data-slot="code-block" data-mini-tool-id=${this.payload.id}>
        <div class="shell">
          <header class="header">
            <div class="meta">
              <span class="language">${getLanguageDisplayName(language)}</span>
              ${
                this.payload.filename
                  ? html`<span class="separator">•</span><span class="filename">${this.payload.filename}</span>`
                  : nothing
              }
            </div>
            <button
              type="button"
              class=${`copy ${this.isCopied ? "success" : ""}`}
              aria-label=${this.isCopied ? "Copied" : "Copy code"}
              @click=${this.copyCode}
            >
              ${this.renderCopyIcon()}
            </button>
          </header>

          <div class=${`code-scroll ${collapsed ? "collapsed" : ""}`} style=${this.collapseHeightStyle()}>
            ${highlightedHtml ? unsafeHTML(highlightedHtml) : nothing}
          </div>

          ${
            showToggle
              ? html`<button class="toggle" type="button" @click=${this.toggleExpanded}>
                ${
                  collapsed
                    ? html`${this.renderChevron(false)} <span>Show all ${lineCount} lines</span>`
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
