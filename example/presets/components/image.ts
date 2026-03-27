import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyImageInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "image-preview-source",
    assetId: "image-source",
    src: "https://images.unsplash.com/photo-1504548840739-580b10ae7715?w=1200&auto=format&fit=crop",
    alt: "Vintage mainframe with blinking lights",
    title: "From mainframes to microchips",
    description: "A snapshot of when rooms were computers — not just what ran inside them.",
    ratio: "4:3",
    domain: "unsplash.com",
    createdAt: "2025-02-10T15:30:00.000Z",
    fileSizeBytes: 2457600,
    source: {
      label: "Computing archives",
      iconUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=archives",
      url: "https://assistant-ui.com/tools/alignment",
    },
  };
}
