type MiniRuntimeBenchmarkInput = {
  component: string;
  payload: unknown;
  iterations: number;
};

type MiniRuntimeBenchmarkSample = {
  defineReadyMs: number;
  mountWorkAvgMs: number;
  mountFrameAvgMs: number;
  mountTotalAvgMs: number;
  updateWorkAvgMs: number;
  updateFrameAvgMs: number;
  updateTotalAvgMs: number;
};

declare global {
  interface Window {
    __miniRuntimeBenchmark?: (input: MiniRuntimeBenchmarkInput) => Promise<MiniRuntimeBenchmarkSample>;
  }
}

const MINI_COMPONENT_LOADERS: Record<string, () => Promise<unknown>> = {
  "approval-card": () => import("@mini/mini-tool/approval-card/approval-card.js"),
  audio: () => import("@mini/mini-tool/audio/audio.js"),
  video: () => import("@mini/mini-tool/video/video.js"),
  chart: () => import("@mini/mini-tool/chart/chart.js"),
  citation: () => import("@mini/mini-tool/citation/citation.js"),
  "citation-list": () => import("@mini/mini-tool/citation-list/citation-list.js"),
  "code-block": () => import("@mini/mini-tool/code-block/code-block.js"),
  "code-diff": () => import("@mini/mini-tool/code-diff/code-diff.js"),
  image: () => import("@mini/mini-tool/image/image.js"),
  "image-gallery": () => import("@mini/mini-tool/image-gallery/image-gallery.js"),
  "geo-map": () => import("@mini/mini-tool/geo-map/geo-map.js"),
  "instagram-post": () => import("@mini/mini-tool/instagram-post/instagram-post.js"),
  "linkedin-post": () => import("@mini/mini-tool/linkedin-post/linkedin-post.js"),
  "link-preview": () => import("@mini/mini-tool/link-preview/link-preview.js"),
  "message-draft": () => import("@mini/mini-tool/message-draft/message-draft.js"),
  "parameter-slider": () => import("@mini/mini-tool/parameter-slider/parameter-slider.js"),
  plan: () => import("@mini/mini-tool/plan/plan.js"),
  "preferences-panel": () => import("@mini/mini-tool/preferences-panel/preferences-panel.js"),
  "option-list": () => import("@mini/mini-tool/option-list/option-list.js"),
  "order-summary": () => import("@mini/mini-tool/order-summary/order-summary.js"),
  "progress-tracker": () => import("@mini/mini-tool/progress-tracker/progress-tracker.js"),
  "stats-display": () => import("@mini/mini-tool/stats-display/stats-display.js"),
  terminal: () => import("@mini/mini-tool/terminal/terminal.js"),
  "x-post": () => import("@mini/mini-tool/x-post/x-post.js"),
};

type BenchmarkElement = HTMLElement & {
  payload: unknown;
  updateComplete?: Promise<unknown>;
};

const payloadClone = (payload: unknown): unknown => JSON.parse(JSON.stringify(payload));

function createBenchmarkElement(tagName: string): BenchmarkElement {
  return document.createElement(tagName) as unknown as BenchmarkElement;
}

const nextFrame = () =>
  new Promise<void>((resolveFrame) => {
    requestAnimationFrame(() => resolveFrame());
  });

function average(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

window.__miniRuntimeBenchmark = async ({ component, payload, iterations }: MiniRuntimeBenchmarkInput) => {
  const loader = MINI_COMPONENT_LOADERS[component];
  if (!loader) {
    throw new Error(`Unsupported mini runtime component '${component}'.`);
  }

  const tagName = `mini-tool-${component}`;

  const defineReadyStart = performance.now();
  await loader();
  await customElements.whenDefined(tagName);
  const defineReadyMs = performance.now() - defineReadyStart;

  const host = document.createElement("div");
  document.body.append(host);

  const mountWorkRuns: number[] = [];
  const mountFrameRuns: number[] = [];
  const mountTotalRuns: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const element = createBenchmarkElement(tagName);

    const startedAt = performance.now();
    element.payload = payloadClone(payload);
    host.append(element);
    await element.updateComplete;
    const afterWorkAt = performance.now();
    await nextFrame();
    const endedAt = performance.now();

    mountWorkRuns.push(afterWorkAt - startedAt);
    mountFrameRuns.push(endedAt - afterWorkAt);
    mountTotalRuns.push(endedAt - startedAt);
    element.remove();
  }

  const updateElement = createBenchmarkElement(tagName);
  updateElement.payload = payloadClone(payload);
  host.append(updateElement);
  await updateElement.updateComplete;
  await nextFrame();

  const updateWorkRuns: number[] = [];
  const updateFrameRuns: number[] = [];
  const updateTotalRuns: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const updatedPayload = payloadClone(payload);
    if (updatedPayload && typeof updatedPayload === "object" && "id" in updatedPayload) {
      const withId = updatedPayload as { id?: unknown };
      if (typeof withId.id === "string") {
        withId.id = `${withId.id}-updated-${index}`;
      }
    }

    const startedAt = performance.now();
    updateElement.payload = updatedPayload;
    await updateElement.updateComplete;
    const afterWorkAt = performance.now();
    await nextFrame();
    const endedAt = performance.now();

    updateWorkRuns.push(afterWorkAt - startedAt);
    updateFrameRuns.push(endedAt - afterWorkAt);
    updateTotalRuns.push(endedAt - startedAt);
  }

  updateElement.remove();
  host.remove();

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

export {};
