import { buildMiniToolUiExampleSnippetKey, renderMiniToolUiExampleSnippet } from "../code-snippets.js";
import type { MiniToolUiExampleHarnessCard } from "../harness-config.js";
import type { MiniToolUiExampleHarnessRuntime, RefreshCardCode } from "./types.js";

export function createCodeViewSync(
  cards: readonly MiniToolUiExampleHarnessCard[],
  harness: MiniToolUiExampleHarnessRuntime,
): {
  refreshCardCode: RefreshCardCode;
  refreshAllCardCode: () => void;
} {
  const refreshCardCode: RefreshCardCode = (elementId) => {
    const card = harness.getCardByElementId(elementId);
    const componentElement = harness.getComponentElement(elementId);
    const codeRenderer = harness.getCodeRenderer(elementId);

    if (!card || !componentElement || !codeRenderer) {
      return;
    }

    try {
      const snippetKey = buildMiniToolUiExampleSnippetKey(card);
      const snippet = renderMiniToolUiExampleSnippet(snippetKey, componentElement.payload);
      codeRenderer.payload = {
        id: `${elementId}-code-view`,
        code: snippet,
        language: "typescript",
        lineNumbers: "hidden",
      };
    } catch (error) {
      const fallback = `Code view unavailable: ${String(error)}`;
      codeRenderer.payload = {
        id: `${elementId}-code-view-error`,
        code: fallback,
        language: "text",
        lineNumbers: "hidden",
      };
    }
  };

  const refreshAllCardCode = () => {
    for (const card of cards) {
      refreshCardCode(card.elementId as Parameters<RefreshCardCode>[0]);
    }
  };

  return {
    refreshCardCode,
    refreshAllCardCode,
  };
}
