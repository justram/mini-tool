import type {
  MiniToolUiExampleElementId,
  MiniToolUiExampleHarnessCard,
  MiniToolUiExampleReceiptId,
  MiniToolUiExampleResetButtonId,
} from "../harness-config.js";
import type {
  MiniToolUiExampleCodeRendererElement,
  MiniToolUiExampleComponentElement,
  MiniToolUiExampleHarnessRuntime,
  MiniToolUiExampleMode,
} from "./types.js";

function formatCardTitle(card: MiniToolUiExampleHarnessCard): string {
  const baseTitle = card.component
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  if (!card.variantId || card.variantId === "default" || card.variantId === "unified") {
    return baseTitle;
  }

  return `${baseTitle} (${card.variantId})`;
}

export function createMiniToolUiExampleHarnessCards(
  exampleRoot: Element,
  cards: readonly MiniToolUiExampleHarnessCard[],
): MiniToolUiExampleHarnessRuntime {
  const componentElements = new Map<MiniToolUiExampleElementId, MiniToolUiExampleComponentElement>();
  const receiptElements = new Map<MiniToolUiExampleReceiptId, HTMLParagraphElement>();
  const resetButtons = new Map<MiniToolUiExampleResetButtonId, HTMLButtonElement>();
  const cardByElementId = new Map<MiniToolUiExampleElementId, MiniToolUiExampleHarnessCard>();
  const codeRenderersByElementId = new Map<MiniToolUiExampleElementId, MiniToolUiExampleCodeRendererElement>();
  const previewPanelsByElementId = new Map<MiniToolUiExampleElementId, HTMLDivElement>();
  const codePanelsByElementId = new Map<MiniToolUiExampleElementId, HTMLDivElement>();
  const previewTabsByElementId = new Map<MiniToolUiExampleElementId, HTMLButtonElement>();
  const codeTabsByElementId = new Map<MiniToolUiExampleElementId, HTMLButtonElement>();

  function setCardDisplayMode(elementId: MiniToolUiExampleElementId, mode: MiniToolUiExampleMode): void {
    const previewPanel = previewPanelsByElementId.get(elementId);
    const codePanel = codePanelsByElementId.get(elementId);
    const previewTab = previewTabsByElementId.get(elementId);
    const codeTab = codeTabsByElementId.get(elementId);

    if (!previewPanel || !codePanel || !previewTab || !codeTab) {
      return;
    }

    const showPreview = mode !== "code";
    const showCode = mode !== "preview";

    previewPanel.hidden = !showPreview;
    codePanel.hidden = !showCode;

    const previewActive = mode !== "code";
    const codeActive = mode === "code";
    previewTab.setAttribute("aria-selected", String(previewActive));
    codeTab.setAttribute("aria-selected", String(codeActive));
    previewTab.dataset.active = String(previewActive);
    codeTab.dataset.active = String(codeActive);
  }

  for (const card of cards) {
    const elementId = card.elementId as MiniToolUiExampleElementId;

    const section = document.createElement("section");
    section.id = `${elementId}-card`;
    section.className = "card";
    section.dataset.testid = card.testId;

    const heading = document.createElement("div");
    heading.className = "card-header";

    const title = document.createElement("h2");
    title.className = "card-title";
    title.textContent = formatCardTitle(card);

    const subtitle = document.createElement("p");
    subtitle.className = "card-subtitle";
    subtitle.textContent = `#${elementId}`;

    heading.append(title, subtitle);
    section.appendChild(heading);

    const componentElement = document.createElement(card.tagName) as MiniToolUiExampleComponentElement;
    componentElement.id = elementId;

    const tabs = document.createElement("div");
    tabs.className = "card-view-tabs";
    tabs.setAttribute("role", "tablist");

    const previewTab = document.createElement("button");
    previewTab.type = "button";
    previewTab.className = "card-tab";
    previewTab.dataset.view = "preview";
    previewTab.textContent = "Preview";
    previewTab.setAttribute("role", "tab");

    const codeTab = document.createElement("button");
    codeTab.type = "button";
    codeTab.className = "card-tab";
    codeTab.dataset.view = "code";
    codeTab.textContent = "Code";
    codeTab.setAttribute("role", "tab");

    tabs.append(previewTab, codeTab);
    section.appendChild(tabs);

    const componentPreview = document.createElement("div");
    componentPreview.className = "card-preview";
    componentPreview.appendChild(componentElement);
    section.appendChild(componentPreview);

    componentElements.set(elementId, componentElement);
    cardByElementId.set(elementId, card);
    previewPanelsByElementId.set(elementId, componentPreview);
    previewTabsByElementId.set(elementId, previewTab);
    codeTabsByElementId.set(elementId, codeTab);

    const codeView = document.createElement("div");
    codeView.className = "card-code-view";

    const codeRenderer = document.createElement("mini-tool-code-block") as MiniToolUiExampleCodeRendererElement;
    codeRenderer.className = "card-code-renderer";

    codeView.append(codeRenderer);
    section.appendChild(codeView);
    codeRenderersByElementId.set(elementId, codeRenderer);
    codePanelsByElementId.set(elementId, codeView);

    previewTab.addEventListener("click", () => {
      setCardDisplayMode(elementId, "preview");
    });

    codeTab.addEventListener("click", () => {
      setCardDisplayMode(elementId, "code");
    });

    if (card.resetButtonId) {
      const controls = document.createElement("div");
      controls.className = "card-controls";

      const resetButton = document.createElement("button");
      resetButton.id = card.resetButtonId;
      resetButton.type = "button";
      resetButton.className = "reset-button";
      resetButton.textContent = "Reset";

      controls.appendChild(resetButton);
      section.appendChild(controls);
      resetButtons.set(card.resetButtonId as MiniToolUiExampleResetButtonId, resetButton);
    }

    if (card.receiptId) {
      const receipt = document.createElement("p");
      receipt.className = "receipt";
      receipt.id = card.receiptId;
      receipt.role = "status";
      receipt.setAttribute("aria-live", "polite");

      section.appendChild(receipt);
      receiptElements.set(card.receiptId as MiniToolUiExampleReceiptId, receipt);
    }

    exampleRoot.appendChild(section);
  }

  function mustGetComponentElement(id: MiniToolUiExampleElementId): MiniToolUiExampleComponentElement {
    const element = componentElements.get(id);
    if (!element) {
      throw new Error(`Missing component element '${id}' in mini-toolui example harness.`);
    }

    return element;
  }

  function mustGetReceipt(id: MiniToolUiExampleReceiptId): HTMLParagraphElement {
    const element = receiptElements.get(id);
    if (!element) {
      throw new Error(`Missing receipt element '${id}' in mini-toolui example harness.`);
    }

    return element;
  }

  function mustGetResetButton(id: MiniToolUiExampleResetButtonId): HTMLButtonElement {
    const element = resetButtons.get(id);
    if (!element) {
      throw new Error(`Missing reset button '${id}' in mini-toolui example harness.`);
    }

    return element;
  }

  function setAllCardsDisplayMode(mode: MiniToolUiExampleMode): void {
    for (const card of cards) {
      setCardDisplayMode(card.elementId as MiniToolUiExampleElementId, mode);
    }
  }

  return {
    mustGetComponentElement,
    mustGetReceipt,
    mustGetResetButton,
    getCardByElementId: (elementId) => cardByElementId.get(elementId),
    getComponentElement: (elementId) => componentElements.get(elementId),
    getCodeRenderer: (elementId) => codeRenderersByElementId.get(elementId),
    setCardDisplayMode,
    setAllCardsDisplayMode,
  };
}
