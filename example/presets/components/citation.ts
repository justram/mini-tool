import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyCitationInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "citation-metadata",
    href: "https://arxiv.org/abs/2303.08774",
    title: "GPT-4 Technical Report",
    snippet:
      "We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs and produce text outputs.",
    domain: "arxiv.org",
    favicon: "https://www.google.com/s2/favicons?domain=arxiv.org&sz=32",
    author: "OpenAI",
    publishedAt: "2023-03-15T00:00:00Z",
    type: "article",
  };
}
