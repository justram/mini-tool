import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyLinkPreviewInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "link-preview-image",
    href: "https://en.wikipedia.org/wiki/History_of_computing_hardware",
    title: "A brief history of computing hardware",
    description: "Mechanical calculators, vacuum tubes, transistors, microprocessors — and what came next.",
    image: "https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&q=80&w=2046",
    domain: "wikipedia.org",
    ratio: "16:9",
  };
}
