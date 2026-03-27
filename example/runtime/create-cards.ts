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
  MiniToolUiExampleModeChangeEventDetail,
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
  const cardSectionsByElementId = new Map<MiniToolUiExampleElementId, HTMLElement>();
  const previewMountedByElementId = new Map<MiniToolUiExampleElementId, boolean>();
  const previewVisibleByElementId = new Map<MiniToolUiExampleElementId, boolean>();
  const displayModeByElementId = new Map<MiniToolUiExampleElementId, MiniToolUiExampleMode>();

  function setPreviewPlaceholderHeight(elementId: MiniToolUiExampleElementId, measuredHeight: number): void {
    const previewPanel = previewPanelsByElementId.get(elementId);
    if (!previewPanel || measuredHeight <= 0) {
      return;
    }

    previewPanel.style.setProperty("--preview-placeholder-height", `${measuredHeight}px`);
  }

  function capturePreviewPlaceholderHeightNextFrame(elementId: MiniToolUiExampleElementId): void {
    const previewPanel = previewPanelsByElementId.get(elementId);
    if (!previewPanel) {
      return;
    }

    requestAnimationFrame(() => {
      const measuredHeight = Math.ceil(previewPanel.getBoundingClientRect().height);
      setPreviewPlaceholderHeight(elementId, measuredHeight);
    });
  }

  function mountPreview(elementId: MiniToolUiExampleElementId): void {
    if (previewMountedByElementId.get(elementId) === true) {
      return;
    }

    const previewPanel = previewPanelsByElementId.get(elementId);
    const componentElement = componentElements.get(elementId);
    if (!previewPanel || !componentElement) {
      return;
    }

    previewPanel.appendChild(componentElement);
    previewPanel.dataset.mounted = "true";
    previewMountedByElementId.set(elementId, true);
    capturePreviewPlaceholderHeightNextFrame(elementId);
  }

  function unmountPreview(elementId: MiniToolUiExampleElementId): void {
    if (previewMountedByElementId.get(elementId) !== true) {
      return;
    }

    const previewPanel = previewPanelsByElementId.get(elementId);
    const componentElement = componentElements.get(elementId);
    if (!previewPanel || !componentElement) {
      return;
    }

    setPreviewPlaceholderHeight(elementId, Math.ceil(previewPanel.getBoundingClientRect().height));
    if (componentElement.parentElement === previewPanel) {
      previewPanel.removeChild(componentElement);
    }

    previewPanel.dataset.mounted = "false";
    previewMountedByElementId.set(elementId, false);
  }

  function reconcilePreviewMount(elementId: MiniToolUiExampleElementId, forceMount = false): void {
    const mode = displayModeByElementId.get(elementId) ?? "preview";
    if (mode !== "preview") {
      unmountPreview(elementId);
      return;
    }

    const isVisible = previewVisibleByElementId.get(elementId) === true;
    if (forceMount || isVisible) {
      mountPreview(elementId);
      return;
    }

    unmountPreview(elementId);
  }

  function ensurePreviewMounted(elementId: MiniToolUiExampleElementId): void {
    previewVisibleByElementId.set(elementId, true);
    mountPreview(elementId);
  }

  function ensureCodeRenderer(elementId: MiniToolUiExampleElementId): MiniToolUiExampleCodeRendererElement | undefined {
    const existingRenderer = codeRenderersByElementId.get(elementId);
    if (existingRenderer) {
      return existingRenderer;
    }

    const codePanel = codePanelsByElementId.get(elementId);
    if (!codePanel) {
      return undefined;
    }

    const codeRenderer = document.createElement("mini-tool-code-block") as MiniToolUiExampleCodeRendererElement;
    codeRenderer.className = "card-code-renderer";
    codePanel.appendChild(codeRenderer);
    codeRenderersByElementId.set(elementId, codeRenderer);
    return codeRenderer;
  }

  function notifyModeChange(elementId: MiniToolUiExampleElementId, mode: MiniToolUiExampleMode): void {
    document.dispatchEvent(
      new CustomEvent<MiniToolUiExampleModeChangeEventDetail>("mini-toolui:card-mode-change", {
        detail: { elementId, mode },
      }),
    );
  }

  function setCardDisplayMode(elementId: MiniToolUiExampleElementId, mode: MiniToolUiExampleMode): void {
    const previousMode = displayModeByElementId.get(elementId) ?? "preview";
    displayModeByElementId.set(elementId, mode);

    const previewPanel = previewPanelsByElementId.get(elementId);
    const codePanel = codePanelsByElementId.get(elementId);
    const previewTab = previewTabsByElementId.get(elementId);
    const codeTab = codeTabsByElementId.get(elementId);

    if (!previewPanel || !codePanel || !previewTab || !codeTab) {
      return;
    }

    const showPreview = mode !== "code";
    const showCode = mode !== "preview";

    if (showCode) {
      ensureCodeRenderer(elementId);
      unmountPreview(elementId);
    } else {
      reconcilePreviewMount(elementId, previousMode === "code");
    }

    previewPanel.hidden = !showPreview;
    codePanel.hidden = !showCode;

    const previewActive = mode !== "code";
    const codeActive = mode === "code";
    previewTab.setAttribute("aria-selected", String(previewActive));
    codeTab.setAttribute("aria-selected", String(codeActive));
    previewTab.dataset.active = String(previewActive);
    codeTab.dataset.active = String(codeActive);

    notifyModeChange(elementId, mode);
  }

  for (const card of cards) {
    const elementId = card.elementId as MiniToolUiExampleElementId;

    const section = document.createElement("section");
    section.id = `${elementId}-card`;
    section.className = "card";
    section.dataset.testid = card.testId;
    cardSectionsByElementId.set(elementId, section);
    previewMountedByElementId.set(elementId, false);
    previewVisibleByElementId.set(elementId, false);
    displayModeByElementId.set(elementId, "preview");

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
    componentPreview.dataset.mounted = "false";
    section.appendChild(componentPreview);

    componentElements.set(elementId, componentElement);
    cardByElementId.set(elementId, card);
    previewPanelsByElementId.set(elementId, componentPreview);
    previewTabsByElementId.set(elementId, previewTab);
    codeTabsByElementId.set(elementId, codeTab);

    const codeView = document.createElement("div");
    codeView.className = "card-code-view";

    section.appendChild(codeView);
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

  if (typeof IntersectionObserver === "function") {
    const previewObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const elementId = entry.target instanceof HTMLElement ? entry.target.id.replace(/-card$/, "") : "";
          const typedElementId = elementId as MiniToolUiExampleElementId;
          if (!cardByElementId.has(typedElementId)) {
            continue;
          }

          previewVisibleByElementId.set(typedElementId, entry.isIntersecting);
          reconcilePreviewMount(typedElementId);
        }
      },
      {
        root: null,
        rootMargin: "800px 0px",
      },
    );

    for (const card of cards) {
      const elementId = card.elementId as MiniToolUiExampleElementId;
      const section = cardSectionsByElementId.get(elementId);
      if (section) {
        previewObserver.observe(section);
      }
    }
  } else {
    for (const card of cards) {
      mountPreview(card.elementId as MiniToolUiExampleElementId);
    }
  }

  for (const card of cards.slice(0, 4)) {
    const elementId = card.elementId as MiniToolUiExampleElementId;
    previewVisibleByElementId.set(elementId, true);
    mountPreview(elementId);
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
    ensurePreviewMounted,
    ensureCodeRenderer,
    setCardDisplayMode,
    setAllCardsDisplayMode,
  };
}
