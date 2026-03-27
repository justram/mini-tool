import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyXPostInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "x-post-basic",
    author: {
      name: "Athia Zohra",
      handle: "athiazohra",
      avatarUrl: "https://images.unsplash.com/photo-1753288695169-e51f5a3ff24f?w=200&h=200&fit=crop",
      verified: true,
    },
    text: "Wild to think: in the 1940s we literally rewired programs by hand. Today, we ship apps worldwide with a single command.",
    stats: { likes: 5 },
    createdAt: "2025-11-05T14:01:00.000Z",
  };
}
