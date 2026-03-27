import { describe, expect, it } from "vitest";
import {
  buildMiniToolUiExampleSnippetKey,
  MINI_TOOLUI_EXAMPLE_SNIPPET_REGISTRY,
  renderMiniToolUiExampleSnippet,
} from "../../example/code-snippets";
import { MINI_TOOLUI_EXAMPLE_HARNESS_CARDS } from "../../example/harness-config";

describe("smoke code snippets", () => {
  it("covers every smoke harness card", () => {
    const missing: string[] = [];

    for (const card of MINI_TOOLUI_EXAMPLE_HARNESS_CARDS) {
      const key = buildMiniToolUiExampleSnippetKey(card);
      if (!MINI_TOOLUI_EXAMPLE_SNIPPET_REGISTRY[key]) {
        missing.push(key);
      }
    }

    expect(missing).toEqual([]);
  });

  it("does not contain unused snippet entries", () => {
    const usedKeys = new Set(MINI_TOOLUI_EXAMPLE_HARNESS_CARDS.map((card) => buildMiniToolUiExampleSnippetKey(card)));
    const registryKeys = Object.keys(MINI_TOOLUI_EXAMPLE_SNIPPET_REGISTRY);
    const unusedKeys = registryKeys.filter((key) => !usedKeys.has(key));

    expect(unusedKeys).toEqual([]);
  });

  it("renders curated action examples for interactive components", () => {
    const optionListCode = renderMiniToolUiExampleSnippet("option-list:default", {
      id: "option-list-preview-max-selections",
      maxSelections: 2,
      options: [],
    });
    expect(optionListCode).toContain("mini-tool:option-list-action");
    expect(optionListCode).toContain('detail.actionId === "confirm"');

    const questionFlowCode = renderMiniToolUiExampleSnippet("question-flow:default", {
      id: "question-flow",
      steps: [],
    });
    expect(questionFlowCode).toContain("mini-tool:question-flow-select");
    expect(questionFlowCode).toContain("mini-tool:question-flow-complete");

    const itemCarouselCode = renderMiniToolUiExampleSnippet("item-carousel:default", {
      id: "item-carousel",
      items: [],
    });
    expect(itemCarouselCode).toContain("mini-tool:item-carousel-item-click");
    expect(itemCarouselCode).toContain("mini-tool:item-carousel-action");

    const chartCode = renderMiniToolUiExampleSnippet("chart:default", {
      id: "chart",
      series: [],
    });
    expect(chartCode).toContain("mini-tool:chart-data-point-click");

    const dataTableCode = renderMiniToolUiExampleSnippet("data-table:default", {
      id: "data-table",
      columns: [],
      rows: [],
    });
    expect(dataTableCode).toContain("mini-tool:data-table-sort-change");

    const instagramCode = renderMiniToolUiExampleSnippet("instagram-post:default", {
      id: "instagram-post",
    });
    expect(instagramCode).toContain("mini-tool:instagram-post-action");

    const linkPreviewCode = renderMiniToolUiExampleSnippet("link-preview:default", {
      id: "link-preview",
      href: "https://example.com",
    });
    expect(linkPreviewCode).toContain("mini-tool:navigate");

    const imageCode = renderMiniToolUiExampleSnippet("image:default", {
      id: "image",
      href: "https://example.com",
      src: "https://example.com/image.png",
    });
    expect(imageCode).toContain("Image navigate");

    const audioCode = renderMiniToolUiExampleSnippet("audio:default", {
      id: "audio",
      src: "https://example.com/audio.mp3",
    });
    expect(audioCode).toContain("mini-tool:audio-media-event");
    expect(audioCode).toContain('element.variant = "full";');

    const videoCode = renderMiniToolUiExampleSnippet("video:default", {
      id: "video",
      src: "https://example.com/video.mp4",
    });
    expect(videoCode).toContain("mini-tool:video-media-event");
    expect(videoCode).toContain("Video navigate");

    const imageGalleryCode = renderMiniToolUiExampleSnippet("image-gallery:default", {
      id: "image-gallery",
      images: [],
    });
    expect(imageGalleryCode).toContain("mini-tool:image-gallery-click");
    expect(imageGalleryCode).toContain("Gallery navigate");
  });
});
