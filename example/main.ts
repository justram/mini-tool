import "./app.css";
import "./register-components.js";
import { MINI_TOOLUI_EXAMPLE_HARNESS_CARDS, type MiniToolUiExampleElementId } from "./harness-config.js";
import { applyInitialPayloads } from "./presets/apply-initial-payloads.js";
import type { MiniToolUiExampleClonePayload } from "./presets/types.js";
import { bindMiniToolUiExampleActions } from "./runtime/actions-runtime.js";
import { createCodeViewSync } from "./runtime/code-view.js";
import { createMiniToolUiExampleHarnessCards } from "./runtime/create-cards.js";
import { bindResetHandlers } from "./runtime/reset-handlers.js";
import { applyTheme, changeThemeWithTransition, resolveInitialTheme } from "./runtime/theme.js";

function formatSidebarLabel(component: string, variantId?: string): string {
  const baseLabel = component
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  if (!variantId || variantId === "default" || variantId === "unified") {
    return baseLabel;
  }

  return `${baseLabel} (${variantId})`;
}

type ExampleCard = (typeof MINI_TOOLUI_EXAMPLE_HARNESS_CARDS)[number];

type SidebarItemRecord = {
  elementId: MiniToolUiExampleElementId;
  label: string;
  group: HTMLElement;
  item: HTMLElement;
};

type MobileJumpGroupRecord = {
  title: string;
  group: HTMLOptGroupElement;
  options: HTMLOptionElement[];
};

type ComponentSection = {
  title: string;
  items: ReadonlySet<string>;
};

const COMPONENT_SECTIONS: readonly ComponentSection[] = [
  {
    title: "Media",
    items: new Set(["link-preview", "image", "audio", "video", "image-gallery", "geo-map"]),
  },
  {
    title: "Content",
    items: new Set(["citation", "citation-list", "progress-tracker", "plan", "terminal"]),
  },
  {
    title: "Data",
    items: new Set(["order-summary", "data-table", "stats-display", "chart", "parameter-slider"]),
  },
  {
    title: "Social",
    items: new Set(["x-post", "instagram-post", "linkedin-post", "message-draft"]),
  },
  {
    title: "Interactive",
    items: new Set(["option-list", "approval-card", "preferences-panel", "item-carousel", "question-flow"]),
  },
  {
    title: "Developer",
    items: new Set(["code-block", "code-diff"]),
  },
];

function resolveSectionTitle(component: string): string {
  return COMPONENT_SECTIONS.find((section) => section.items.has(component))?.title ?? "More";
}

function queryRequiredElement<T extends typeof Element>(
  selector: string,
  description: string,
  elementType: T,
): InstanceType<T> {
  const element = document.querySelector(selector);
  if (!(element instanceof elementType)) {
    throw new Error(`Missing ${description} in example app.`);
  }

  return element as InstanceType<T>;
}

function isMiniToolUiExampleElementId(value: string): value is MiniToolUiExampleElementId {
  return MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.some((card) => card.elementId === value);
}

function keepSidebarLinkVisible(link: HTMLAnchorElement | null) {
  if (!splitPaneMediaQuery.matches || !link) {
    return;
  }

  const sidebarBounds = componentSidebar.getBoundingClientRect();
  const linkBounds = link.getBoundingClientRect();
  const topInset = 24;
  const bottomInset = 24;

  if (linkBounds.top >= sidebarBounds.top + topInset && linkBounds.bottom <= sidebarBounds.bottom - bottomInset) {
    return;
  }

  link.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
}

function setActiveSidebarLink(elementId: MiniToolUiExampleElementId, keepVisible = true) {
  const nextActiveLink = sidebarLinksByElementId.get(elementId) ?? null;
  if (activeSidebarLink === nextActiveLink && activeElementId === elementId) {
    if (mobileComponentJump.value !== elementId) {
      mobileComponentJump.value = elementId;
    }
    return;
  }

  activeSidebarLink?.classList.remove("is-active");
  nextActiveLink?.classList.add("is-active");
  activeSidebarLink = nextActiveLink;
  activeElementId = elementId;
  mobileComponentJump.value = elementId;

  if (keepVisible) {
    keepSidebarLinkVisible(nextActiveLink);
  }
}

function scrollContentToCard(
  elementId: MiniToolUiExampleElementId,
  behavior: ScrollBehavior = "auto",
  updateHash = true,
  keepVisible = true,
) {
  harness.ensurePreviewMounted(elementId);

  const targetCard = document.getElementById(`${elementId}-card`);
  if (!(targetCard instanceof HTMLElement)) {
    return;
  }

  setActiveSidebarLink(elementId, keepVisible);

  if (splitPaneMediaQuery.matches) {
    const contentBounds = contentShell.getBoundingClientRect();
    const targetBounds = targetCard.getBoundingClientRect();
    const nextTop = contentShell.scrollTop + targetBounds.top - contentBounds.top - 20;

    contentShell.scrollTo({
      top: Math.max(0, nextTop),
      behavior,
    });
  } else {
    targetCard.scrollIntoView({
      block: "start",
      behavior,
    });
  }

  if (updateHash) {
    window.history.replaceState(null, "", `#${targetCard.id}`);
  }
}

function appendMobileJumpOptionGroup(title: string, cards: readonly ExampleCard[]) {
  const group = document.createElement("optgroup");
  group.label = title;
  const options: HTMLOptionElement[] = [];

  for (const card of cards) {
    const option = document.createElement("option");
    option.value = card.elementId;
    option.textContent = formatSidebarLabel(card.component, "variantId" in card ? card.variantId : undefined);
    option.dataset.search = option.textContent.toLowerCase();
    group.append(option);
    options.push(option);
  }

  mobileJumpGroups.push({
    title,
    group,
    options,
  });
  mobileComponentJump.append(group);
}

function appendSidebarGroup(container: HTMLElement, title: string, cards: readonly ExampleCard[]) {
  const group = document.createElement("section");
  group.className = "component-sidebar__group";
  group.dataset.sectionTitle = title.toLowerCase();

  const heading = document.createElement("h2");
  heading.className = "component-sidebar__group-title";
  heading.textContent = title;

  const list = document.createElement("div");
  list.className = "component-sidebar__group-list";

  for (const card of cards) {
    const item = document.createElement("div");
    item.className = "component-sidebar__item";

    const titleLink = document.createElement("a");
    titleLink.className = "component-sidebar__item-title";
    titleLink.href = `#${card.elementId}-card`;
    titleLink.textContent = formatSidebarLabel(card.component, "variantId" in card ? card.variantId : undefined);
    titleLink.addEventListener("click", (event) => {
      event.preventDefault();
      scrollContentToCard(card.elementId, "smooth");
    });

    sidebarLinksByElementId.set(card.elementId, titleLink);
    sidebarItems.push({
      elementId: card.elementId,
      label: titleLink.textContent.toLowerCase(),
      group,
      item,
    });
    item.append(titleLink);
    list.append(item);
  }

  group.append(heading, list);
  container.appendChild(group);
}

const miniToolUiExampleRoot = queryRequiredElement(
  "#mini-toolui-example-root",
  "#mini-toolui-example-root container",
  HTMLElement,
);
const componentSidebarNav = queryRequiredElement(
  "#component-sidebar-nav",
  "#component-sidebar-nav container",
  HTMLElement,
);
const contentShell = queryRequiredElement(".content-shell", ".content-shell container", HTMLElement);
const componentSidebar = queryRequiredElement(".component-sidebar", ".component-sidebar container", HTMLElement);
const mobileComponentJump = queryRequiredElement(
  "#mobile-component-jump",
  "#mobile-component-jump element",
  HTMLSelectElement,
);
const componentSidebarSearch = queryRequiredElement(
  "#component-sidebar-search",
  "#component-sidebar-search element",
  HTMLInputElement,
);

const splitPaneMediaQuery = window.matchMedia("(min-width: 56rem)");
const sidebarLinksByElementId = new Map<string, HTMLAnchorElement>();
const sidebarItems: SidebarItemRecord[] = [];
const mobileJumpGroups: MobileJumpGroupRecord[] = [];
let activeSidebarLink: HTMLAnchorElement | null = null;
let activeElementId: MiniToolUiExampleElementId | "" = "";
let sidebarFilterQuery = "";

const sidebarCount = queryRequiredElement("#component-sidebar-count", "#component-sidebar-count element", HTMLElement);
const introCount = queryRequiredElement("#component-example-count", "#component-example-count element", HTMLElement);

const harness = createMiniToolUiExampleHarnessCards(miniToolUiExampleRoot, MINI_TOOLUI_EXAMPLE_HARNESS_CARDS);

const cardsBySection = new Map<string, ExampleCard[]>();
for (const card of MINI_TOOLUI_EXAMPLE_HARNESS_CARDS) {
  const sectionTitle = resolveSectionTitle(card.component);
  const existingCards = cardsBySection.get(sectionTitle);

  if (existingCards) {
    existingCards.push(card);
    continue;
  }

  cardsBySection.set(sectionTitle, [card]);
}

for (const section of COMPONENT_SECTIONS) {
  const sectionCards = cardsBySection.get(section.title);
  if (!sectionCards || sectionCards.length === 0) {
    continue;
  }

  appendSidebarGroup(componentSidebarNav, section.title, sectionCards);
  appendMobileJumpOptionGroup(section.title, sectionCards);
}

const uncategorizedCards = cardsBySection.get("More");
if (uncategorizedCards && uncategorizedCards.length > 0) {
  appendSidebarGroup(componentSidebarNav, "More", uncategorizedCards);
  appendMobileJumpOptionGroup("More", uncategorizedCards);
}

const exampleCountLabel = `${MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.length} examples`;
sidebarCount.textContent = exampleCountLabel;
introCount.textContent = exampleCountLabel;

function applySidebarFilter(query: string) {
  sidebarFilterQuery = query.trim().toLowerCase();

  for (const group of mobileJumpGroups) {
    let visibleOptionCount = 0;

    for (const option of group.options) {
      const matches = sidebarFilterQuery.length === 0 || option.dataset.search?.includes(sidebarFilterQuery);
      option.hidden = !matches;
      visibleOptionCount += matches ? 1 : 0;
    }

    group.group.disabled = visibleOptionCount === 0;
  }

  const visibleGroups = new Set<HTMLElement>();
  let visibleItemCount = 0;

  for (const item of sidebarItems) {
    const matches = sidebarFilterQuery.length === 0 || item.label.includes(sidebarFilterQuery);
    item.item.hidden = !matches;

    if (matches) {
      visibleGroups.add(item.group);
      visibleItemCount += 1;
    }
  }

  for (const group of componentSidebarNav.querySelectorAll<HTMLElement>(".component-sidebar__group")) {
    group.hidden = !visibleGroups.has(group);
  }

  sidebarCount.textContent = sidebarFilterQuery.length === 0 ? exampleCountLabel : `${visibleItemCount} matches`;

  if (activeElementId && sidebarLinksByElementId.has(activeElementId)) {
    keepSidebarLinkVisible(sidebarLinksByElementId.get(activeElementId) ?? null);
  }
}

function syncActiveSidebarLink() {
  const contentBounds = splitPaneMediaQuery.matches ? contentShell.getBoundingClientRect() : undefined;
  const activationTop = contentBounds ? contentBounds.top + 96 : 96;
  const viewportBottom = contentBounds ? contentBounds.bottom : window.innerHeight;
  let nextActiveElementId: MiniToolUiExampleElementId | undefined = MINI_TOOLUI_EXAMPLE_HARNESS_CARDS[0]?.elementId;

  for (const card of MINI_TOOLUI_EXAMPLE_HARNESS_CARDS) {
    const targetCard = document.getElementById(`${card.elementId}-card`);
    if (!(targetCard instanceof HTMLElement)) {
      continue;
    }

    const targetBounds = targetCard.getBoundingClientRect();
    if (targetBounds.bottom <= activationTop) {
      nextActiveElementId = card.elementId;
      continue;
    }

    if (targetBounds.top < viewportBottom) {
      nextActiveElementId = card.elementId;
    }
    break;
  }

  if (nextActiveElementId) {
    setActiveSidebarLink(nextActiveElementId);
  }
}

const optionListElement = harness.mustGetComponentElement("option-list");
const approvalCardElement = harness.mustGetComponentElement("approval-card");
const instagramPostElement = harness.mustGetComponentElement("instagram-post");
const messageDraftElement = harness.mustGetComponentElement("message-draft");
const preferencesPanelElement = harness.mustGetComponentElement("preferences-panel");
const questionFlowElement = harness.mustGetComponentElement("question-flow");

const approvalCardResetButton = harness.mustGetResetButton("approval-card-reset");
const instagramPostResetButton = harness.mustGetResetButton("instagram-post-reset");
const messageDraftResetButton = harness.mustGetResetButton("message-draft-reset");
const questionFlowResetButton = harness.mustGetResetButton("question-flow-reset");

const receipt = harness.mustGetReceipt("receipt");
const approvalReceipt = harness.mustGetReceipt("approval-receipt");
const chartReceipt = harness.mustGetReceipt("chart-receipt");
const instagramReceipt = harness.mustGetReceipt("instagram-receipt");
const messageDraftReceipt = harness.mustGetReceipt("message-draft-receipt");
const parameterSliderReceipt = harness.mustGetReceipt("parameter-slider-receipt");
const preferencesPanelReceipt = harness.mustGetReceipt("preferences-panel-receipt");
const itemCarouselReceipt = harness.mustGetReceipt("item-carousel-receipt");
const questionFlowReceipt = harness.mustGetReceipt("question-flow-receipt");

const { refreshCardCode } = createCodeViewSync(MINI_TOOLUI_EXAMPLE_HARNESS_CARDS, harness);

const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const layoutConstrainedButton = document.querySelector("#layout-constrained");
const layoutFluidButton = document.querySelector("#layout-fluid");

const THEME_STORAGE_KEY = "mini-toolui-example-theme";
const LAYOUT_STORAGE_KEY = "mini-toolui-example-layout";

const clonePayload: MiniToolUiExampleClonePayload = (payload) => {
  return JSON.parse(JSON.stringify(payload));
};

const themeElements = {
  button: themeToggle,
  label: themeToggleLabel,
};

const initialTheme = resolveInitialTheme(THEME_STORAGE_KEY, "light");
applyTheme(initialTheme, themeElements);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.getAttribute("data-theme") === "dark";
    const nextTheme = isCurrentlyDark ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    changeThemeWithTransition(nextTheme, themeElements);
  });
}

type LayoutMode = "constrained" | "fluid";

function applyLayout(mode: LayoutMode) {
  const body = document.body;
  body.classList.remove("layout-constrained", "layout-fluid");
  body.classList.add(mode === "fluid" ? "layout-fluid" : "layout-constrained");

  if (layoutConstrainedButton) {
    layoutConstrainedButton.setAttribute("aria-pressed", String(mode !== "fluid"));
  }

  if (layoutFluidButton) {
    layoutFluidButton.setAttribute("aria-pressed", String(mode === "fluid"));
  }
}

const persistedLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
const initialLayout: LayoutMode =
  persistedLayout === "fluid" || (!persistedLayout && window.matchMedia("(min-width: 56rem)").matches)
    ? "fluid"
    : "constrained";
applyLayout(initialLayout);

if (layoutConstrainedButton) {
  layoutConstrainedButton.addEventListener("click", () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "constrained");
    applyLayout("constrained");
  });
}

if (layoutFluidButton) {
  layoutFluidButton.addEventListener("click", () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "fluid");
    applyLayout("fluid");
  });
}

componentSidebarSearch.addEventListener("input", () => {
  applySidebarFilter(componentSidebarSearch.value);
});

mobileComponentJump.addEventListener("change", () => {
  const nextElementId = mobileComponentJump.value;
  if (!isMiniToolUiExampleElementId(nextElementId)) {
    return;
  }

  scrollContentToCard(nextElementId, "smooth");
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return;
  }

  event.preventDefault();
  componentSidebarSearch.focus();
  componentSidebarSearch.select();
});

harness.setAllCardsDisplayMode("preview");
applySidebarFilter("");
syncActiveSidebarLink();

const hashTarget = window.location.hash.match(/^#(.+)-card$/)?.[1];
if (hashTarget && isMiniToolUiExampleElementId(hashTarget)) {
  scrollContentToCard(hashTarget, "auto", false);
}

contentShell.addEventListener("scroll", syncActiveSidebarLink, { passive: true });
window.addEventListener("scroll", syncActiveSidebarLink, { passive: true });
splitPaneMediaQuery.addEventListener("change", () => {
  syncActiveSidebarLink();

  const updatedHashTarget = window.location.hash.match(/^#(.+)-card$/)?.[1];
  if (updatedHashTarget && isMiniToolUiExampleElementId(updatedHashTarget)) {
    scrollContentToCard(updatedHashTarget, "auto", false);
  }
});
window.addEventListener("hashchange", () => {
  const updatedHashTarget = window.location.hash.match(/^#(.+)-card$/)?.[1];
  if (!updatedHashTarget || !isMiniToolUiExampleElementId(updatedHashTarget)) {
    return;
  }

  scrollContentToCard(updatedHashTarget, "auto", false);
});

const {
  initialApprovalCardPayload,
  initialInstagramPostPayload,
  initialMessageDraftPayload,
  initialPreferencesPanelPayload,
  initialQuestionFlowPayload,
} = applyInitialPayloads(harness.mustGetComponentElement, clonePayload);

const unbindMiniToolActions = bindMiniToolUiExampleActions({
  optionListElement,
  approvalCardElement,
  messageDraftElement,
  preferencesPanelElement,
  questionFlowElement,
  receipt,
  approvalReceipt,
  chartReceipt,
  instagramReceipt,
  messageDraftReceipt,
  parameterSliderReceipt,
  preferencesPanelReceipt,
  itemCarouselReceipt,
  questionFlowReceipt,
  initialPreferencesPanelPayload,
  initialQuestionFlowPayload,
  refreshCardCode,
  clonePayload,
});

window.addEventListener("beforeunload", () => {
  unbindMiniToolActions();
});

bindResetHandlers({
  approvalCardResetButton,
  instagramPostResetButton,
  messageDraftResetButton,
  questionFlowResetButton,
  approvalCardElement,
  instagramPostElement,
  messageDraftElement,
  questionFlowElement,
  approvalReceipt,
  instagramReceipt,
  messageDraftReceipt,
  questionFlowReceipt,
  initialApprovalCardPayload,
  initialInstagramPostPayload,
  initialMessageDraftPayload,
  initialQuestionFlowPayload,
  clonePayload,
  refreshCardCode,
});
