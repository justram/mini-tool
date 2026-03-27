export type QualityTheme = "light" | "dark";
export type QualityProfile = "display" | "interactive";
export type QualityGeometryRisk = "none" | "bounded" | "series-alignment";

export type QualityAction =
  | {
      type: "click" | "hover" | "focus";
      selector: string;
      index?: number;
      optional?: boolean;
    }
  | {
      type: "press";
      selector: string;
      key: string;
      index?: number;
      optional?: boolean;
    };

export type QualityCheck =
  | {
      type: "exists";
      name: string;
      phase: "before" | "after";
      selector: string;
      minCount?: number;
    }
  | {
      type: "visible";
      name: string;
      phase: "before" | "after";
      selector: string;
      minCount?: number;
    }
  | {
      type: "not-visible";
      name: string;
      phase: "before" | "after";
      selector: string;
      maxCount?: number;
    }
  | {
      type: "focused";
      name: string;
      phase: "before" | "after";
      selector: string;
    }
  | {
      type: "style-different";
      name: string;
      phase: "before" | "after";
      selectorA: string;
      selectorB: string;
      property: string;
    }
  | {
      type: "style-equals";
      name: string;
      phase: "before" | "after";
      selectorA: string;
      selectorB: string;
      property: string;
    }
  | {
      type: "style-equals-value";
      name: string;
      phase: "before" | "after";
      selector: string;
      property: string;
      expected: string;
    }
  | {
      type: "style-not-equals-value";
      name: string;
      phase: "before" | "after";
      selector: string;
      property: string;
      forbidden: string;
    }
  | {
      type: "contrast";
      name: string;
      phase: "before" | "after";
      textSelector: string;
      backgroundSelector: string;
      minRatio: number;
    }
  | {
      type: "text-contains";
      name: string;
      phase: "before" | "after";
      selector: string;
      expected: string;
    }
  | {
      type: "vertical-distance-max";
      name: string;
      phase: "before" | "after";
      selectorA: string;
      edgeA: "top" | "bottom";
      selectorB: string;
      edgeB: "top" | "bottom";
      maxPx: number;
    }
  | {
      type: "contained-within";
      name: string;
      phase: "before" | "after";
      containerSelector: string;
      elementSelector: string;
      tolerancePx?: number;
    }
  | {
      type: "centered-within";
      name: string;
      phase: "before" | "after";
      containerSelector: string;
      elementSelector: string;
      axis?: "x" | "y" | "both";
      maxDeltaPx: number;
    }
  | {
      type: "edge-balance-max-delta";
      name: string;
      phase: "before" | "after";
      containerSelector: string;
      elementSelector: string;
      axis?: "x" | "y" | "both";
      maxDeltaPx: number;
    }
  | {
      type: "center-distance-max";
      name: string;
      phase: "before" | "after";
      selectorA: string;
      selectorB: string;
      axis?: "x" | "y" | "both";
      maxDeltaPx: number;
    }
  | {
      type: "size-delta-max";
      name: string;
      phase: "before" | "after";
      selectorA: string;
      selectorB: string;
      dimension?: "width" | "height" | "both";
      maxDeltaPx: number;
    }
  | {
      type: "nearest-center-distance-max";
      name: string;
      phase: "before" | "after";
      selector: string;
      candidateSelector: string;
      axis?: "x" | "y" | "both";
      maxDeltaPx: number;
    }
  | {
      type: "svg-namespace";
      name: string;
      phase: "before" | "after";
      selector: string;
      minCount?: number;
    }
  | {
      type: "covers-viewport-min-ratio";
      name: string;
      phase: "before" | "after";
      selector: string;
      minWidthRatio: number;
      minHeightRatio: number;
    }
  | {
      type: "topmost-at-point-within-host";
      name: string;
      phase: "before" | "after";
      point: "viewport-center" | "selector-center";
      selector?: string;
    };

export type QualityState = "default" | "transition" | "terminal" | "reset";

export type QualityStateMatrix = {
  modeful: boolean;
  states: QualityState[];
};

export type QualityComponentManifest = {
  component: string;
  profile: QualityProfile;
  geometryRisk: QualityGeometryRisk;
  hostSelector: string;
  themes: QualityTheme[];
  resetActions?: QualityAction[];
  actions?: QualityAction[];
  checks: QualityCheck[];
  requiresExternalReset?: boolean;
  stateMatrix?: QualityStateMatrix;
};

const BOTH_THEMES: QualityTheme[] = ["light", "dark"];

type EntryOptions = {
  component: string;
  profile?: QualityProfile;
  geometryRisk?: QualityGeometryRisk;
  hostSelector?: string;
  textSelector: string;
  minRatio?: number;
  checks?: QualityCheck[];
  actions?: QualityAction[];
  resetActions?: QualityAction[];
  requiresExternalReset?: boolean;
  stateMatrix?: QualityStateMatrix;
};

function createEntry(options: EntryOptions): QualityComponentManifest {
  const hostSelector =
    options.hostSelector ?? `[data-testid='${options.component}-card'] mini-tool-${options.component}`;
  const slotSelector = `[data-slot='${options.component}']`;

  const baseChecks: QualityCheck[] = [
    {
      type: "exists",
      name: "component root is rendered",
      phase: "before",
      selector: slotSelector,
    },
    {
      type: "contrast",
      name: "primary text remains readable",
      phase: "before",
      textSelector: options.textSelector,
      backgroundSelector: slotSelector,
      minRatio: options.minRatio ?? 4.5,
    },
  ];

  const profile = options.profile ?? "display";
  if (profile === "interactive" && options.geometryRisk === undefined) {
    throw new Error(
      `Interactive quality manifest entry '${options.component}' must declare geometryRisk explicitly ('none' | 'bounded' | 'series-alignment').`,
    );
  }

  return {
    component: options.component,
    profile,
    geometryRisk: options.geometryRisk ?? "none",
    hostSelector,
    themes: BOTH_THEMES,
    checks: [...baseChecks, ...(options.checks ?? [])],
    actions: options.actions,
    resetActions: options.resetActions,
    requiresExternalReset: options.requiresExternalReset,
    stateMatrix: options.stateMatrix,
  };
}

export const QUALITY_MANIFEST: QualityComponentManifest[] = [
  createEntry({ component: "link-preview", textSelector: ".title" }),
  createEntry({ component: "image", textSelector: ".title" }),
  createEntry({ component: "audio", textSelector: ".title" }),
  createEntry({
    component: "video",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".description",
    actions: [
      { type: "hover", selector: ".media" },
      { type: "focus", selector: ".open-link", optional: true },
    ],
    checks: [
      {
        type: "exists",
        name: "video overlay and gradient layers exist",
        phase: "before",
        selector: ".overlay, .overlay-gradient",
        minCount: 2,
      },
      {
        type: "not-visible",
        name: "video overlay stays hidden before interaction",
        phase: "before",
        selector: ".overlay, .overlay-gradient",
        maxCount: 0,
      },
      {
        type: "contained-within",
        name: "video media element remains clipped within media frame",
        phase: "before",
        containerSelector: ".media",
        elementSelector: ".video",
        tolerancePx: 0.5,
      },
      {
        type: "visible",
        name: "video overlay and gradient appear on hover",
        phase: "after",
        selector: ".overlay, .overlay-gradient",
        minCount: 2,
      },
      {
        type: "style-different",
        name: "video element receives hover transform distinct from container",
        phase: "after",
        selectorA: ".video",
        selectorB: ".media",
        property: "transform",
      },
    ],
  }),
  createEntry({ component: "citation", textSelector: ".title" }),
  createEntry({ component: "citation-list", textSelector: ".sources-count", minRatio: 3 }),
  createEntry({ component: "progress-tracker", textSelector: ".label", minRatio: 3 }),
  createEntry({ component: "approval-card", textSelector: ".title", requiresExternalReset: true }),
  createEntry({ component: "order-summary", textSelector: ".title" }),
  createEntry({
    component: "data-table",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".header-label",
    actions: [
      { type: "focus", selector: ".column-button", index: 0 },
      { type: "press", selector: ".column-button", key: "Enter", index: 0 },
    ],
    checks: [
      {
        type: "exists",
        name: "data-table renders table shell",
        phase: "before",
        selector: ".table-wrap",
      },
      {
        type: "contained-within",
        name: "data-table scroll shell remains within component root",
        phase: "before",
        containerSelector: ".root",
        elementSelector: ".table-wrap",
        tolerancePx: 1,
      },
      {
        type: "focused",
        name: "data-table header receives keyboard focus",
        phase: "after",
        selector: ".column-button",
      },
      {
        type: "exists",
        name: "data-table sets active sort indicator after keyboard toggle",
        phase: "after",
        selector: ".sort-indicator.asc, .sort-indicator.desc",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "stats-display",
    textSelector: ".title",
    checks: [
      {
        type: "svg-namespace",
        name: "stats-display sparkline uses valid SVG namespace nodes",
        phase: "before",
        selector: ".sparkline",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "option-list",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: "button[role='option']",
    resetActions: [{ type: "click", selector: ".option[aria-selected='true']", optional: true }],
    actions: [
      { type: "focus", selector: "button[role='option']", index: 1 },
      { type: "press", selector: "button[role='option']", key: "Space", index: 1 },
    ],
    checks: [
      {
        type: "focused",
        name: "keyboard focus lands on target option",
        phase: "after",
        selector: "button[role='option']",
      },
      {
        type: "exists",
        name: "selection state appears after keyboard toggle",
        phase: "after",
        selector: ".option[aria-selected='true']",
        minCount: 1,
      },
      {
        type: "style-different",
        name: "selected option background differs from unselected",
        phase: "after",
        selectorA: ".option[aria-selected='true']",
        selectorB: ".option[aria-selected='false']",
        property: "background-color",
      },
      {
        type: "style-different",
        name: "selected option border differs from unselected",
        phase: "after",
        selectorA: ".option[aria-selected='true']",
        selectorB: ".option[aria-selected='false']",
        property: "border-color",
      },
      {
        type: "style-equals",
        name: "unselected option text follows container foreground token",
        phase: "after",
        selectorA: ".option[aria-selected='false']",
        selectorB: ".root",
        property: "color",
      },
      {
        type: "contained-within",
        name: "option-list confirm action stays inside actions row",
        phase: "after",
        containerSelector: ".actions",
        elementSelector: "button[data-action-id='confirm']",
        tolerancePx: 0.5,
      },
    ],
  }),
  createEntry({
    component: "chart",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    actions: [
      { type: "focus", selector: ".bar", index: 0 },
      { type: "press", selector: ".bar", key: "Enter", index: 0 },
    ],
    checks: [
      {
        type: "contrast",
        name: "chart description remains readable",
        phase: "before",
        textSelector: ".description",
        backgroundSelector: "[data-slot='chart']",
        minRatio: 3,
      },
      {
        type: "contained-within",
        name: "chart svg stays within responsive svg wrap",
        phase: "before",
        containerSelector: ".svg-wrap",
        elementSelector: ".svg",
        tolerancePx: 0.5,
      },
      {
        type: "svg-namespace",
        name: "chart svg uses valid SVG namespace nodes",
        phase: "before",
        selector: ".svg",
        minCount: 1,
      },
      {
        type: "exists",
        name: "chart renders primary plotted marks before interaction",
        phase: "before",
        selector: ".bar, .series-line",
        minCount: 1,
      },
      {
        type: "focused",
        name: "bar receives focus during keyboard path",
        phase: "after",
        selector: ".bar",
      },
      {
        type: "visible",
        name: "tooltip appears on focus/interaction",
        phase: "after",
        selector: ".chart-tooltip",
        minCount: 1,
      },
      {
        type: "contrast",
        name: "tooltip value remains readable",
        phase: "after",
        textSelector: ".chart-tooltip-value",
        backgroundSelector: ".chart-tooltip",
        minRatio: 4.5,
      },
    ],
  }),
  createEntry({
    component: "x-post",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".handle",
    minRatio: 3,
    actions: [{ type: "focus", selector: "button[aria-label='Like']", index: 0 }],
    checks: [
      {
        type: "exists",
        name: "x-post action buttons are present",
        phase: "before",
        selector: "button[aria-label='Like'], button[aria-label='Share']",
        minCount: 2,
      },
      {
        type: "style-equals-value",
        name: "x-post action row top spacing matches source rhythm",
        phase: "before",
        selector: ".actions",
        property: "margin-top",
        expected: "12px",
      },
      {
        type: "style-equals-value",
        name: "x-post action row horizontal rhythm matches source gap",
        phase: "before",
        selector: ".actions",
        property: "column-gap",
        expected: "16px",
      },
      {
        type: "center-distance-max",
        name: "x-post like icon and count stay vertically centered",
        phase: "before",
        selectorA: "button[aria-label='Like'] .icon",
        selectorB: "button[aria-label='Like'] .count",
        axis: "y",
        maxDeltaPx: 0.75,
      },
      {
        type: "size-delta-max",
        name: "x-post like/share icon sizes stay visually consistent",
        phase: "before",
        selectorA: "button[aria-label='Like'] .icon",
        selectorB: "button[aria-label='Share'] .icon",
        dimension: "both",
        maxDeltaPx: 1,
      },
      {
        type: "focused",
        name: "x-post like action receives keyboard focus",
        phase: "after",
        selector: "button[aria-label='Like']",
      },
      {
        type: "visible",
        name: "x-post like tooltip becomes visible on focus",
        phase: "after",
        selector: ".action-wrap .tooltip",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "instagram-post",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".handle",
    minRatio: 3,
    requiresExternalReset: true,
    actions: [{ type: "focus", selector: "button[aria-label='Like']", index: 0 }],
    checks: [
      {
        type: "exists",
        name: "instagram action buttons are present",
        phase: "before",
        selector: "button[aria-label='Like'], button[aria-label='Share']",
        minCount: 2,
      },
      {
        type: "style-equals-value",
        name: "instagram body stack spacing matches source rhythm",
        phase: "before",
        selector: ".body",
        property: "row-gap",
        expected: "8px",
      },
      {
        type: "style-equals-value",
        name: "instagram action row spacing matches source rhythm",
        phase: "before",
        selector: ".actions",
        property: "column-gap",
        expected: "4px",
      },
      {
        type: "center-distance-max",
        name: "instagram like icon and count stay vertically centered",
        phase: "before",
        selectorA: "button[aria-label='Like'] .icon",
        selectorB: "button[aria-label='Like'] .count",
        axis: "y",
        maxDeltaPx: 0.75,
      },
      {
        type: "size-delta-max",
        name: "instagram like/share icon sizes stay visually consistent",
        phase: "before",
        selectorA: "button[aria-label='Like'] .icon",
        selectorB: "button[aria-label='Share'] .icon",
        dimension: "both",
        maxDeltaPx: 1,
      },
      {
        type: "focused",
        name: "instagram like action receives keyboard focus",
        phase: "after",
        selector: "button[aria-label='Like']",
      },
      {
        type: "visible",
        name: "instagram like tooltip becomes visible on focus",
        phase: "after",
        selector: ".action-wrap .tooltip",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "linkedin-post",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".author-name",
    minRatio: 3,
    actions: [{ type: "focus", selector: "button[aria-label='Like']", index: 0 }],
    checks: [
      {
        type: "exists",
        name: "linkedin-post action buttons are present",
        phase: "before",
        selector: "button[aria-label='Like'], button[aria-label='Share']",
        minCount: 2,
      },
      {
        type: "exists",
        name: "linkedin-post long text affordance renders see-more trigger",
        phase: "before",
        selector: ".see-more",
        minCount: 1,
      },
      {
        type: "text-contains",
        name: "linkedin-post preview includes truncation marker",
        phase: "before",
        selector: ".body-text",
        expected: "...",
      },
      {
        type: "text-contains",
        name: "linkedin-post like count remains visible in canonical fixture",
        phase: "before",
        selector: ".count",
        expected: "(847)",
      },
      {
        type: "style-equals-value",
        name: "linkedin-post action row top spacing matches source rhythm",
        phase: "before",
        selector: ".actions",
        property: "margin-top",
        expected: "4px",
      },
      {
        type: "style-equals-value",
        name: "linkedin-post action row border inset matches source rhythm",
        phase: "before",
        selector: ".actions",
        property: "padding-top",
        expected: "6px",
      },
      {
        type: "style-equals-value",
        name: "linkedin-post action row horizontal rhythm matches source gap",
        phase: "before",
        selector: ".actions",
        property: "column-gap",
        expected: "4px",
      },
      {
        type: "vertical-distance-max",
        name: "linkedin-post see-more remains inline with truncated preview",
        phase: "before",
        selectorA: ".body-preview",
        edgeA: "bottom",
        selectorB: ".see-more",
        edgeB: "bottom",
        maxPx: 6,
      },
      {
        type: "focused",
        name: "linkedin-post like action receives keyboard focus",
        phase: "after",
        selector: "button[aria-label='Like']",
      },
      {
        type: "visible",
        name: "linkedin-post like tooltip becomes visible on focus",
        phase: "after",
        selector: ".action-wrap .tooltip",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "message-draft",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    requiresExternalReset: true,
    actions: [
      { type: "focus", selector: ".action.action-primary" },
      { type: "press", selector: ".action.action-primary", key: "Enter" },
    ],
    checks: [
      {
        type: "style-equals-value",
        name: "message-draft action buttons preserve pill geometry",
        phase: "before",
        selector: ".action",
        property: "border-radius",
        expected: "999px",
      },
      {
        type: "contained-within",
        name: "message-draft primary action remains within actions container",
        phase: "before",
        containerSelector: ".actions",
        elementSelector: ".action.action-primary",
        tolerancePx: 0.5,
      },
      {
        type: "focused",
        name: "undo action receives focus when entering sending state",
        phase: "after",
        selector: ".action-undo",
      },
      {
        type: "visible",
        name: "sending label is visible during undo grace period",
        phase: "after",
        selector: ".sending-label",
        minCount: 1,
      },
    ],
  }),
  createEntry({
    component: "parameter-slider",
    profile: "interactive",
    geometryRisk: "series-alignment",
    textSelector: ".label",
    actions: [
      { type: "hover", selector: ".slider-input", index: 0 },
      { type: "focus", selector: ".slider-input", index: 0 },
      { type: "press", selector: ".slider-input", index: 0, key: "ArrowRight" },
    ],
    checks: [
      {
        type: "exists",
        name: "parameter-slider renders expected slider rows",
        phase: "before",
        selector: ".slider-row",
        minCount: 3,
      },
      {
        type: "exists",
        name: "parameter-slider renders dense tick rail",
        phase: "before",
        selector: ".tick",
        minCount: 45,
      },
      {
        type: "style-equals-value",
        name: "parameter-slider track corners follow global radius token",
        phase: "before",
        selector: ".track-shell",
        property: "border-radius",
        expected: "6px",
      },
      {
        type: "style-equals-value",
        name: "parameter-slider edge ticks stay hidden to preserve rounded corners",
        phase: "before",
        selector: ".tick.edge",
        property: "background-color",
        expected: "rgba(0, 0, 0, 0)",
      },
      {
        type: "style-equals-value",
        name: "parameter-slider major tick height matches source morphology",
        phase: "before",
        selector: ".tick.major",
        property: "height",
        expected: "8px",
      },
      {
        type: "style-equals-value",
        name: "parameter-slider minor tick height matches source morphology",
        phase: "before",
        selector: ".tick.minor",
        property: "height",
        expected: "6px",
      },
      {
        type: "text-contains",
        name: "parameter-slider shows signed dB value",
        phase: "before",
        selector: ".value",
        expected: "+3.0 dB",
      },
      {
        type: "nearest-center-distance-max",
        name: "parameter-slider marker aligns to nearest major tick when value is an integer",
        phase: "before",
        selector: ".value-marker",
        candidateSelector: ".tick.major:not(.edge)",
        axis: "x",
        maxDeltaPx: 1,
      },
      {
        type: "focused",
        name: "parameter-slider keeps keyboard focus on first slider",
        phase: "after",
        selector: ".slider-input",
      },
      {
        type: "style-different",
        name: "parameter-slider marker thickens relative to major tick on interaction",
        phase: "after",
        selectorA: ".value-marker",
        selectorB: ".tick.major",
        property: "width",
      },
      {
        type: "style-different",
        name: "parameter-slider marker height grows beyond major tick on interaction",
        phase: "after",
        selectorA: ".value-marker",
        selectorB: ".tick.major",
        property: "height",
      },
      {
        type: "text-contains",
        name: "parameter-slider value changes after keyboard step",
        phase: "after",
        selector: ".value",
        expected: "+3.1 dB",
      },
    ],
  }),
  createEntry({
    component: "plan",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    actions: [
      { type: "focus", selector: ".todo-row", index: 0 },
      { type: "press", selector: ".todo-row", key: "Enter", index: 0 },
    ],
    checks: [
      {
        type: "style-equals-value",
        name: "plan todo rows keep rounded interactive geometry",
        phase: "before",
        selector: ".todo-row",
        property: "border-radius",
        expected: "10px",
      },
      {
        type: "contained-within",
        name: "plan todo rows remain within list container",
        phase: "before",
        containerSelector: ".todo-list",
        elementSelector: ".todo-row",
        tolerancePx: 0.5,
      },
      {
        type: "focused",
        name: "plan first todo row receives keyboard focus",
        phase: "after",
        selector: ".todo-row",
      },
    ],
  }),
  createEntry({
    component: "preferences-panel",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".item-label",
    actions: [
      { type: "focus", selector: "input.switch-input", index: 0 },
      { type: "press", selector: "input.switch-input", key: "Space", index: 0 },
    ],
    checks: [
      {
        type: "style-equals-value",
        name: "switch track clips thumb overflow",
        phase: "before",
        selector: ".switch-control",
        property: "overflow",
        expected: "hidden",
      },
      {
        type: "style-equals-value",
        name: "switch track width matches source geometry",
        phase: "before",
        selector: ".switch-control",
        property: "width",
        expected: "32px",
      },
      {
        type: "style-equals-value",
        name: "switch track height matches source geometry",
        phase: "before",
        selector: ".switch-control",
        property: "height",
        expected: "18px",
      },
      {
        type: "style-equals-value",
        name: "switch thumb width matches source geometry",
        phase: "before",
        selector: ".switch-thumb",
        property: "width",
        expected: "16px",
      },
      {
        type: "style-equals-value",
        name: "switch thumb height matches source geometry",
        phase: "before",
        selector: ".switch-thumb",
        property: "height",
        expected: "16px",
      },
      {
        type: "style-different",
        name: "switch thumb tone stays distinct from track in current theme",
        phase: "before",
        selectorA: ".switch-thumb",
        selectorB: ".switch-input",
        property: "background-color",
      },
      {
        type: "contained-within",
        name: "switch thumb stays inside track before interaction",
        phase: "before",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        tolerancePx: 0.5,
      },
      {
        type: "centered-within",
        name: "switch thumb is vertically centered in track before interaction",
        phase: "before",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        axis: "y",
        maxDeltaPx: 0.6,
      },
      {
        type: "edge-balance-max-delta",
        name: "switch thumb top/bottom spacing is balanced before interaction",
        phase: "before",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        axis: "y",
        maxDeltaPx: 0.6,
      },
      {
        type: "focused",
        name: "switch receives keyboard focus",
        phase: "after",
        selector: "input.switch-input",
      },
      {
        type: "contained-within",
        name: "switch thumb stays inside track after keyboard toggle",
        phase: "after",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        tolerancePx: 0.5,
      },
      {
        type: "centered-within",
        name: "switch thumb remains vertically centered after keyboard toggle",
        phase: "after",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        axis: "y",
        maxDeltaPx: 0.6,
      },
      {
        type: "edge-balance-max-delta",
        name: "switch thumb top/bottom spacing remains balanced after keyboard toggle",
        phase: "after",
        containerSelector: ".switch-control",
        elementSelector: ".switch-thumb",
        axis: "y",
        maxDeltaPx: 0.6,
      },
      {
        type: "style-different",
        name: "switch thumb tone remains distinct from checked track in current theme",
        phase: "after",
        selectorA: ".switch-thumb",
        selectorB: ".switch-input",
        property: "background-color",
      },
      {
        type: "style-not-equals-value",
        name: "save action becomes enabled after changing a control",
        phase: "after",
        selector: "button[data-action-id='save']",
        property: "cursor",
        forbidden: "not-allowed",
      },
      {
        type: "exists",
        name: "panel retains all preference rows after interaction",
        phase: "after",
        selector: ".item-row",
        minCount: 3,
      },
    ],
  }),
  createEntry({
    component: "terminal",
    profile: "interactive",
    geometryRisk: "bounded",
    hostSelector: "[data-testid='terminal-collapsible-card'] mini-tool-terminal",
    textSelector: ".command-line",
    actions: [
      { type: "focus", selector: ".toggle" },
      { type: "press", selector: ".toggle", key: "Enter" },
    ],
    checks: [
      {
        type: "exists",
        name: "terminal toggle is rendered for long output",
        phase: "before",
        selector: ".toggle",
      },
      {
        type: "text-contains",
        name: "terminal collapsed affordance is visible before interaction",
        phase: "before",
        selector: ".toggle",
        expected: "Show all",
      },
      {
        type: "contained-within",
        name: "terminal shell stays contained within card",
        phase: "before",
        containerSelector: ".root",
        elementSelector: ".shell",
        tolerancePx: 1,
      },
      {
        type: "text-contains",
        name: "terminal toggle switches to collapse after keyboard action",
        phase: "after",
        selector: ".toggle",
        expected: "Collapse",
      },
      {
        type: "exists",
        name: "terminal output expands after keyboard action",
        phase: "after",
        selector: ".output-region:not(.collapsed)",
      },
    ],
  }),
  createEntry({
    component: "image-gallery",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    actions: [
      { type: "focus", selector: ".tile-button", index: 0 },
      { type: "press", selector: ".tile-button", key: "Enter", index: 0 },
    ],
    checks: [
      {
        type: "exists",
        name: "gallery renders at least one tile",
        phase: "before",
        selector: ".tile",
        minCount: 1,
      },
      {
        type: "contained-within",
        name: "image tiles remain clipped to card",
        phase: "before",
        containerSelector: ".root",
        elementSelector: ".grid",
        tolerancePx: 1,
      },
      {
        type: "exists",
        name: "lightbox opens after keyboard activation",
        phase: "after",
        selector: ".lightbox",
      },
      {
        type: "exists",
        name: "lightbox renders full-size image",
        phase: "after",
        selector: ".lightbox-image",
      },
      {
        type: "covers-viewport-min-ratio",
        name: "lightbox backdrop covers viewport",
        phase: "after",
        selector: ".lightbox",
        minWidthRatio: 0.98,
        minHeightRatio: 0.98,
      },
      {
        type: "topmost-at-point-within-host",
        name: "lightbox remains topmost at viewport center",
        phase: "after",
        point: "viewport-center",
      },
    ],
  }),
  createEntry({
    component: "item-carousel",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".name",
    actions: [{ type: "focus", selector: ".card-hit", index: 0 }],
    checks: [
      {
        type: "exists",
        name: "item-carousel renders cards",
        phase: "before",
        selector: ".item",
        minCount: 2,
      },
      {
        type: "contained-within",
        name: "item-carousel track stays within viewport",
        phase: "before",
        containerSelector: ".viewport",
        elementSelector: ".track",
        tolerancePx: 1,
      },
      {
        type: "focused",
        name: "item-carousel card receives keyboard focus",
        phase: "after",
        selector: ".card-hit",
      },
      {
        type: "exists",
        name: "item-carousel exposes right navigation when overflow exists",
        phase: "after",
        selector: ".nav-right",
      },
    ],
  }),
  createEntry({
    component: "geo-map",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    actions: [
      { type: "focus", selector: ".marker[data-marker-id]", index: 0 },
      { type: "press", selector: ".marker[data-marker-id]", key: "Enter", index: 0 },
    ],
    checks: [
      {
        type: "exists",
        name: "geo-map canvas is rendered",
        phase: "before",
        selector: ".canvas",
      },
      {
        type: "exists",
        name: "geo-map displays marker affordances",
        phase: "before",
        selector: ".marker",
        minCount: 1,
      },
      {
        type: "contained-within",
        name: "geo-map map host stays within canvas bounds",
        phase: "before",
        containerSelector: ".canvas",
        elementSelector: ".map-host",
        tolerancePx: 1,
      },
      {
        type: "focused",
        name: "geo-map marker receives keyboard focus",
        phase: "after",
        selector: ".marker[data-marker-id]",
      },
      {
        type: "exists",
        name: "geo-map selection panel appears after activation",
        phase: "after",
        selector: ".selection-panel",
      },
    ],
  }),
  createEntry({
    component: "code-block",
    hostSelector: "[data-testid='code-block-card'] mini-tool-code-block[id]",
    textSelector: ".filename",
  }),
  createEntry({
    component: "question-flow",
    profile: "interactive",
    geometryRisk: "bounded",
    textSelector: ".title",
    requiresExternalReset: true,
    stateMatrix: {
      modeful: true,
      states: ["default", "transition", "terminal", "reset"],
    },
    actions: [
      { type: "focus", selector: ".option", index: 0 },
      { type: "click", selector: ".option", index: 0 },
      { type: "click", selector: ".next-button" },
    ],
    checks: [
      {
        type: "exists",
        name: "question-flow renders option choices before interaction",
        phase: "before",
        selector: ".option",
        minCount: 2,
      },
      {
        type: "contained-within",
        name: "question-flow options remain inside card body",
        phase: "before",
        containerSelector: ".card-body",
        elementSelector: ".options",
        tolerancePx: 1,
      },
      {
        type: "text-contains",
        name: "question-flow advances to next step after selection",
        phase: "after",
        selector: ".step-indicator",
        expected: "Step 2 of 3",
      },
      {
        type: "text-contains",
        name: "question-flow next step title becomes visible",
        phase: "after",
        selector: ".step-body.current .title",
        expected: "Choose a framework",
      },
      {
        type: "exists",
        name: "question-flow renders back navigation on later steps",
        phase: "after",
        selector: ".back-button",
      },
      {
        type: "style-not-equals-value",
        name: "question-flow step transition animation is active after advancing",
        phase: "after",
        selector: ".step-body.current",
        property: "animation-name",
        forbidden: "none",
      },
    ],
  }),
  createEntry({
    component: "code-diff",
    textSelector: ".filename",
    checks: [
      {
        type: "exists",
        name: "unified mode renders both additions and deletions",
        phase: "before",
        selector: ".line.add, .line.del",
        minCount: 2,
      },
      {
        type: "style-different",
        name: "added and removed line backgrounds remain distinguishable",
        phase: "before",
        selectorA: ".line.add",
        selectorB: ".line.del",
        property: "background-color",
      },
      {
        type: "contained-within",
        name: "unified added row background spans the horizontal lane",
        phase: "before",
        containerSelector: ".unified-rows",
        elementSelector: ".line.add",
        tolerancePx: 1,
      },
      {
        type: "contained-within",
        name: "unified removed row background spans the horizontal lane",
        phase: "before",
        containerSelector: ".unified-rows",
        elementSelector: ".line.del",
        tolerancePx: 1,
      },
    ],
  }),
];

export const QUALITY_MANIFEST_COMPONENTS = QUALITY_MANIFEST.map((entry) => entry.component);

export function validateQualityManifest(entries: QualityComponentManifest[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const geometryCheckTypes: QualityCheck["type"][] = [
    "contained-within",
    "centered-within",
    "edge-balance-max-delta",
    "center-distance-max",
    "size-delta-max",
    "vertical-distance-max",
    "nearest-center-distance-max",
  ];

  for (const entry of entries) {
    if (seen.has(entry.component)) {
      errors.push(`duplicate manifest entry for component '${entry.component}'`);
      continue;
    }

    seen.add(entry.component);

    const themeSet = new Set(entry.themes);
    if (!(themeSet.has("light") && themeSet.has("dark")) || themeSet.size !== 2) {
      errors.push(`component '${entry.component}' must declare themes exactly ['light', 'dark']`);
    }

    const beforeChecks = entry.checks.filter((check) => check.phase === "before");
    const afterChecks = entry.checks.filter((check) => check.phase === "after");

    if (beforeChecks.length < 2) {
      errors.push(`component '${entry.component}' must have at least 2 before-phase checks`);
    }

    if (!beforeChecks.some((check) => check.type === "exists")) {
      errors.push(`component '${entry.component}' must include a before-phase 'exists' check`);
    }

    if (!beforeChecks.some((check) => check.type === "contrast")) {
      errors.push(`component '${entry.component}' must include a before-phase 'contrast' check`);
    }

    const actions = entry.actions ?? [];
    if (entry.profile === "interactive") {
      if (actions.length === 0) {
        errors.push(`interactive component '${entry.component}' must define at least one action`);
      }

      const hasKeyboardAction = actions.some((action) => action.type === "focus" || action.type === "press");
      if (!hasKeyboardAction) {
        errors.push(`interactive component '${entry.component}' must include a keyboard action (focus or press)`);
      }

      if (afterChecks.length === 0) {
        errors.push(`interactive component '${entry.component}' must define at least one after-phase check`);
      }

      const hasStateAssertion = afterChecks.some((check) =>
        [
          "visible",
          "focused",
          "exists",
          "style-different",
          "style-equals",
          "style-equals-value",
          "style-not-equals-value",
          "contained-within",
          "centered-within",
          "edge-balance-max-delta",
          "nearest-center-distance-max",
          "covers-viewport-min-ratio",
          "topmost-at-point-within-host",
        ].includes(check.type),
      );
      if (!hasStateAssertion) {
        errors.push(`interactive component '${entry.component}' must include an after-phase state assertion`);
      }

      const geometryChecks = entry.checks.filter((check) => geometryCheckTypes.includes(check.type));
      if (entry.geometryRisk !== "none" && geometryChecks.length === 0) {
        errors.push(
          `interactive component '${entry.component}' with geometryRisk='${entry.geometryRisk}' must include at least one geometry check`,
        );
      }

      if (entry.geometryRisk === "series-alignment") {
        const hasSeriesAlignmentCheck = entry.checks.some((check) => check.type === "nearest-center-distance-max");
        if (!hasSeriesAlignmentCheck) {
          errors.push(
            `interactive component '${entry.component}' with geometryRisk='series-alignment' must include a 'nearest-center-distance-max' check`,
          );
        }
      }
    }

    if (entry.stateMatrix?.modeful === true) {
      const stateSet = new Set(entry.stateMatrix.states);

      if (!stateSet.has("default") || !stateSet.has("terminal")) {
        errors.push(
          `modeful component '${entry.component}' stateMatrix must include at least 'default' and 'terminal' states`,
        );
      }

      if (stateSet.has("transition")) {
        const hasTransitionAssertion = entry.checks.some(
          (check) =>
            check.type === "style-different" ||
            check.type === "style-not-equals-value" ||
            check.type === "center-distance-max" ||
            check.type === "size-delta-max",
        );

        if (!hasTransitionAssertion) {
          errors.push(
            `modeful component '${entry.component}' declares 'transition' state but has no transition-oriented assertion`,
          );
        }
      }

      if (stateSet.has("reset") && !(entry.requiresExternalReset || (entry.resetActions?.length ?? 0) > 0)) {
        errors.push(
          `modeful component '${entry.component}' declares 'reset' state but defines no reset strategy (requiresExternalReset or resetActions)`,
        );
      }
    }

    if (actions.length > 0 && afterChecks.length === 0) {
      errors.push(`component '${entry.component}' defines actions but no after-phase checks`);
    }
  }

  return errors;
}
