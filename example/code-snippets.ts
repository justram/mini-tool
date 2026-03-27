import type { MiniToolUiExampleHarnessCard } from "./harness-config.js";
import { MINI_TOOLUI_EXAMPLE_EVENTS, type MiniToolUiExampleEventName } from "./runtime/events.js";

type MiniToolUiExampleCardLike = Pick<MiniToolUiExampleHarnessCard, "component" | "variantId">;

type MiniToolUiExampleSnippetDefinition = {
  componentImport: string;
  tagName: string;
  omitPayloadKeys?: readonly string[];
  elementAssignments?: readonly string[];
  render?: (payload: unknown, definition: MiniToolUiExampleSnippetDefinition) => string;
};

function toSnippetKey(component: string, variantId?: string): string {
  return `${component}:${variantId ?? "default"}`;
}

export function buildMiniToolUiExampleSnippetKey(card: MiniToolUiExampleCardLike): string {
  return toSnippetKey(card.component, card.variantId);
}

function renderDefaultSnippet(payload: unknown, definition: MiniToolUiExampleSnippetDefinition): string {
  const payloadLiteral = buildPayloadLiteral(payload, definition.omitPayloadKeys);
  const importLine = `import "mini-toolui/components/${definition.componentImport}";`;
  const assignmentLines = definition.elementAssignments ? `\n${definition.elementAssignments.join("\n")}` : "";

  return `${importLine}\n\nconst element = document.createElement("${definition.tagName}");\nelement.payload = ${payloadLiteral};${assignmentLines}\ndocument.body.append(element);`;
}

type ActionSnippetConfig = {
  eventName: MiniToolUiExampleEventName;
  handlerLines: readonly string[];
};

function renderActionSnippet(
  payload: unknown,
  definition: MiniToolUiExampleSnippetDefinition,
  config: ActionSnippetConfig,
): string {
  const payloadLiteral = buildPayloadLiteral(payload, definition.omitPayloadKeys);
  const importLine = `import "mini-toolui/components/${definition.componentImport}";`;
  const assignmentLines = definition.elementAssignments ? `\n${definition.elementAssignments.join("\n")}` : "";
  const handler = config.handlerLines.map((line) => `  ${line}`).join("\n");

  return `${importLine}\n\nconst element = document.createElement("${definition.tagName}");\nelement.payload = ${payloadLiteral};${assignmentLines}\n\nelement.addEventListener("${config.eventName}", (event) => {\n${handler}\n});\n\ndocument.body.append(element);`;
}

export const MINI_TOOLUI_EXAMPLE_SNIPPET_REGISTRY: Readonly<Record<string, MiniToolUiExampleSnippetDefinition>> = {
  "link-preview:default": {
    componentImport: "link-preview",
    tagName: "mini-tool-link-preview",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.navigate,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Navigate:", detail.href, detail.target);',
        ],
      }),
  },
  "image:default": {
    componentImport: "image",
    tagName: "mini-tool-image",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.navigate,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Image navigate:", detail.href, detail.target);',
        ],
      }),
  },
  "audio:default": {
    componentImport: "audio",
    tagName: "mini-tool-audio",
    elementAssignments: ['element.variant = "full";'],
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.audioMediaEvent,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Audio event:", detail.action, detail.currentTimeMs);',
        ],
      }),
  },
  "video:default": {
    componentImport: "video",
    tagName: "mini-tool-video",
    render: (payload, definition) => {
      const base = renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.videoMediaEvent,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Video media event:", detail.action, detail.currentTimeMs);',
        ],
      });

      return `${base}\n\nelement.addEventListener("${MINI_TOOLUI_EXAMPLE_EVENTS.navigate}", (event) => {\n  const detail = (event as CustomEvent).detail;\n  console.log("Video navigate:", detail.href, detail.target);\n});`;
    },
  },
  "citation:default": {
    componentImport: "citation",
    tagName: "mini-tool-citation",
  },
  "citation-list:default": {
    componentImport: "citation-list",
    tagName: "mini-tool-citation-list",
  },
  "progress-tracker:default": {
    componentImport: "progress-tracker",
    tagName: "mini-tool-progress-tracker",
  },
  "option-list:default": {
    componentImport: "option-list",
    tagName: "mini-tool-option-list",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.optionListAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'if (detail.actionId === "confirm") {',
          '  console.log("Confirmed selection:", detail.state?.selected);',
          "}",
        ],
      }),
  },
  "approval-card:default": {
    componentImport: "approval-card",
    tagName: "mini-tool-approval-card",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.approvalCardAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Approval action:", detail.actionId);',
        ],
      }),
  },
  "order-summary:default": {
    componentImport: "order-summary",
    tagName: "mini-tool-order-summary",
  },
  "data-table:default": {
    componentImport: "data-table",
    tagName: "mini-tool-data-table",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.dataTableSortChange,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Sort changed:", detail.column, detail.direction);',
        ],
      }),
  },
  "stats-display:default": {
    componentImport: "stats-display",
    tagName: "mini-tool-stats-display",
  },
  "chart:default": {
    componentImport: "chart",
    tagName: "mini-tool-chart",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.chartDataPointClick,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Point clicked:", detail.seriesLabel, detail.xValue, detail.yValue);',
        ],
      }),
  },
  "chart:line": {
    componentImport: "chart",
    tagName: "mini-tool-chart",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.chartDataPointClick,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Line point:", detail.seriesLabel, detail.xValue, detail.yValue);',
        ],
      }),
  },
  "x-post:default": {
    componentImport: "x-post",
    tagName: "mini-tool-x-post",
  },
  "instagram-post:default": {
    componentImport: "instagram-post",
    tagName: "mini-tool-instagram-post",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.instagramPostAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Instagram action:", detail.actionId);',
        ],
      }),
  },
  "linkedin-post:default": {
    componentImport: "linkedin-post",
    tagName: "mini-tool-linkedin-post",
  },
  "code-block:default": {
    componentImport: "code-block",
    tagName: "mini-tool-code-block",
  },
  "code-block:collapsible": {
    componentImport: "code-block",
    tagName: "mini-tool-code-block",
  },
  "code-diff:unified": {
    componentImport: "code-diff",
    tagName: "mini-tool-code-diff",
  },
  "code-diff:split": {
    componentImport: "code-diff",
    tagName: "mini-tool-code-diff",
  },
  "parameter-slider:default": {
    componentImport: "parameter-slider",
    tagName: "mini-tool-parameter-slider",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.parameterSliderAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Slider values:", detail.state?.values);',
        ],
      }),
  },
  "plan:default": {
    componentImport: "plan",
    tagName: "mini-tool-plan",
  },
  "preferences-panel:default": {
    componentImport: "preferences-panel",
    tagName: "mini-tool-preferences-panel",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.preferencesPanelAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Preferences action:", detail.actionId, detail.state?.value);',
        ],
      }),
  },
  "message-draft:default": {
    componentImport: "message-draft",
    tagName: "mini-tool-message-draft",
    render: (payload, definition) =>
      renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.messageDraftAction,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Draft action:", detail.actionId, detail.state?.outcome);',
        ],
      }),
  },
  "terminal:default": {
    componentImport: "terminal",
    tagName: "mini-tool-terminal",
  },
  "terminal:collapsible": {
    componentImport: "terminal",
    tagName: "mini-tool-terminal",
  },
  "image-gallery:default": {
    componentImport: "image-gallery",
    tagName: "mini-tool-image-gallery",
    render: (payload, definition) => {
      const base = renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.imageGalleryClick,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Gallery click:", detail.imageId);',
        ],
      });

      return `${base}\n\nelement.addEventListener("${MINI_TOOLUI_EXAMPLE_EVENTS.navigate}", (event) => {\n  const detail = (event as CustomEvent).detail;\n  console.log("Gallery navigate:", detail.href, detail.target);\n});`;
    },
  },
  "item-carousel:default": {
    componentImport: "item-carousel",
    tagName: "mini-tool-item-carousel",
    render: (payload, definition) => {
      const base = renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.itemCarouselItemClick,
        handlerLines: ["const detail = (event as CustomEvent).detail;", 'console.log("Item click:", detail.itemId);'],
      });

      return `${base}\n\nelement.addEventListener("${MINI_TOOLUI_EXAMPLE_EVENTS.itemCarouselAction}", (event) => {\n  const detail = (event as CustomEvent).detail;\n  console.log("Item action:", detail.itemId, detail.actionId);\n});`;
    },
  },
  "question-flow:default": {
    componentImport: "question-flow",
    tagName: "mini-tool-question-flow",
    render: (payload, definition) => {
      const base = renderActionSnippet(payload, definition, {
        eventName: MINI_TOOLUI_EXAMPLE_EVENTS.questionFlowSelect,
        handlerLines: [
          "const detail = (event as CustomEvent).detail;",
          'console.log("Selection:", detail.stepId, detail.optionId, detail.selected);',
        ],
      });

      return `${base}\n\nelement.addEventListener("${MINI_TOOLUI_EXAMPLE_EVENTS.questionFlowComplete}", (event) => {\n  const detail = (event as CustomEvent).detail;\n  console.log("Completed:", detail.answers);\n});`;
    },
  },
  "geo-map:default": {
    componentImport: "geo-map",
    tagName: "mini-tool-geo-map",
  },
};

function indent(value: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function formatTsValue(value: unknown): string {
  if (typeof value === "string") {
    if (value.includes("\n")) {
      const escaped = value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      return `\`${escaped}\``;
    }

    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return JSON.stringify(value, null, 2) ?? "null";
}

function buildPayloadLiteral(payload: unknown, omittedKeys: readonly string[] = []): string {
  const payloadRecord = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!payloadRecord) {
    return "{}";
  }

  const filteredEntries = Object.entries(payloadRecord).filter(([key, value]) => {
    return !omittedKeys.includes(key) && value !== undefined;
  });

  const filteredPayload = Object.fromEntries(filteredEntries);
  const value = formatTsValue(filteredPayload);

  if (!value.includes("\n")) {
    return value;
  }

  return `\n${indent(value, 2)}\n`;
}

export function renderMiniToolUiExampleSnippet(snippetKey: string, payload: unknown): string {
  const definition = MINI_TOOLUI_EXAMPLE_SNIPPET_REGISTRY[snippetKey];
  if (!definition) {
    throw new Error(`Missing mini-toolui example snippet definition for '${snippetKey}'.`);
  }

  if (definition.render) {
    return definition.render(payload, definition);
  }

  return renderDefaultSnippet(payload, definition);
}
