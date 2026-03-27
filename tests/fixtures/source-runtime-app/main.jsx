import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

if (typeof globalThis.process === "undefined") {
  globalThis.process = { env: { NODE_ENV: "production" } };
}

const passthroughProps = (payload) => payload;
const wrapPostProps = (payload) => ({ post: payload });

const SOURCE_COMPONENT_DEFINITIONS = {
  "approval-card": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/approval-card/approval-card.tsx");
      return mod.ApprovalCard;
    },
    mapProps: passthroughProps,
  },
  audio: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/audio/audio.tsx");
      return mod.Audio;
    },
    mapProps: passthroughProps,
  },
  video: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/video/video.tsx");
      return mod.Video;
    },
    mapProps: passthroughProps,
  },
  chart: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/chart/chart.tsx");
      return mod.Chart;
    },
    mapProps: passthroughProps,
  },
  citation: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/citation/citation.tsx");
      return mod.Citation;
    },
    mapProps: passthroughProps,
  },
  "citation-list": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/citation/citation-list.tsx");
      return mod.CitationList;
    },
    mapProps: passthroughProps,
  },
  "code-block": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/code-block/code-block.tsx");
      return mod.CodeBlock;
    },
    mapProps: passthroughProps,
  },
  "code-diff": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/code-diff/code-diff.tsx");
      return mod.CodeDiff;
    },
    mapProps: passthroughProps,
  },
  image: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/image/image.tsx");
      return mod.Image;
    },
    mapProps: passthroughProps,
  },
  "image-gallery": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/image-gallery/image-gallery.tsx");
      return mod.ImageGallery;
    },
    mapProps: passthroughProps,
  },
  "geo-map": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/geo-map/geo-map.tsx");
      return mod.GeoMap;
    },
    mapProps: passthroughProps,
  },
  "instagram-post": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/instagram-post/instagram-post.tsx");
      return mod.InstagramPost;
    },
    mapProps: wrapPostProps,
  },
  "linkedin-post": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/linkedin-post/linkedin-post.tsx");
      return mod.LinkedInPost;
    },
    mapProps: wrapPostProps,
  },
  "link-preview": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/link-preview/link-preview.tsx");
      return mod.LinkPreview;
    },
    mapProps: passthroughProps,
  },
  "message-draft": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/message-draft/message-draft.tsx");
      return mod.MessageDraft;
    },
    mapProps: passthroughProps,
  },
  "parameter-slider": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/parameter-slider/parameter-slider.tsx");
      return mod.ParameterSlider;
    },
    mapProps: passthroughProps,
  },
  plan: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/plan/plan.tsx");
      return mod.Plan;
    },
    mapProps: passthroughProps,
  },
  "preferences-panel": {
    load: async () => {
      const mod =
        await import("../../../../tool-ui/apps/www/components/tool-ui/preferences-panel/preferences-panel.tsx");
      return mod.PreferencesPanel;
    },
    mapProps: passthroughProps,
  },
  "option-list": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/option-list/option-list.tsx");
      return mod.OptionList;
    },
    mapProps: passthroughProps,
  },
  "order-summary": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/order-summary/order-summary.tsx");
      return mod.OrderSummary;
    },
    mapProps: passthroughProps,
  },
  "progress-tracker": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/progress-tracker/progress-tracker.tsx");
      return mod.ProgressTracker;
    },
    mapProps: passthroughProps,
  },
  "stats-display": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/stats-display/stats-display.tsx");
      return mod.StatsDisplay;
    },
    mapProps: passthroughProps,
  },
  terminal: {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/terminal/terminal.tsx");
      return mod.Terminal;
    },
    mapProps: passthroughProps,
  },
  "x-post": {
    load: async () => {
      const mod = await import("../../../../tool-ui/apps/www/components/tool-ui/x-post/x-post.tsx");
      return mod.XPost;
    },
    mapProps: wrapPostProps,
  },
};

const clonePayload = (payload) => JSON.parse(JSON.stringify(payload));

const nextFrame = () =>
  new Promise((resolveFrame) => {
    requestAnimationFrame(() => resolveFrame());
  });

const average = (values) => values.reduce((acc, value) => acc + value, 0) / values.length;

window.__sourceRuntimeBenchmark = async ({ component, payload, iterations }) => {
  const definition = SOURCE_COMPONENT_DEFINITIONS[component];
  if (!definition) {
    throw new Error(`Unsupported source runtime component '${component}'.`);
  }

  const defineReadyStart = performance.now();
  const Component = await definition.load();
  const defineReadyMs = performance.now() - defineReadyStart;

  const toRenderProps = (value) => definition.mapProps(clonePayload(value));

  const mountWorkRuns = [];
  const mountFrameRuns = [];
  const mountTotalRuns = [];
  for (let index = 0; index < iterations; index += 1) {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    const startedAt = performance.now();
    flushSync(() => {
      root.render(React.createElement(Component, toRenderProps(payload)));
    });
    const afterWorkAt = performance.now();
    await nextFrame();
    const endedAt = performance.now();

    mountWorkRuns.push(afterWorkAt - startedAt);
    mountFrameRuns.push(endedAt - afterWorkAt);
    mountTotalRuns.push(endedAt - startedAt);
    root.unmount();
    host.remove();
  }

  const updateHost = document.createElement("div");
  document.body.append(updateHost);
  const updateRoot = createRoot(updateHost);

  flushSync(() => {
    updateRoot.render(React.createElement(Component, toRenderProps(payload)));
  });
  await nextFrame();

  const updateWorkRuns = [];
  const updateFrameRuns = [];
  const updateTotalRuns = [];
  for (let index = 0; index < iterations; index += 1) {
    const updated = clonePayload(payload);
    if (updated && typeof updated === "object" && typeof updated.id === "string") {
      updated.id = `${updated.id}-updated-${index}`;
    }

    const startedAt = performance.now();
    flushSync(() => {
      updateRoot.render(React.createElement(Component, toRenderProps(updated)));
    });
    const afterWorkAt = performance.now();
    await nextFrame();
    const endedAt = performance.now();

    updateWorkRuns.push(afterWorkAt - startedAt);
    updateFrameRuns.push(endedAt - afterWorkAt);
    updateTotalRuns.push(endedAt - startedAt);
  }

  updateRoot.unmount();
  updateHost.remove();

  const mountWorkAvgMs = average(mountWorkRuns);
  const mountFrameAvgMs = average(mountFrameRuns);
  const mountTotalAvgMs = average(mountTotalRuns);

  const updateWorkAvgMs = average(updateWorkRuns);
  const updateFrameAvgMs = average(updateFrameRuns);
  const updateTotalAvgMs = average(updateTotalRuns);

  return {
    defineReadyMs,
    mountWorkAvgMs,
    mountFrameAvgMs,
    mountTotalAvgMs,
    updateWorkAvgMs,
    updateFrameAvgMs,
    updateTotalAvgMs,
  };
};
