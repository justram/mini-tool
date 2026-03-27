import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyLinkedinPostInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "li-post-basic",
    author: {
      name: "Dr. Sarah Chen",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
      headline: "VP of Engineering at TechCorp | Building the future of AI",
    },
    text: "Excited to share that our team just shipped a major update to our ML pipeline. Six months of hard work, countless iterations, and one incredible team.\n\nKey learnings:\n• Start with the problem, not the solution\n• Iterate fast, fail faster\n• Celebrate small wins\n\nProud of everyone who made this possible!",
    stats: { likes: 847 },
    createdAt: "2025-11-05T09:15:00.000Z",
  };
}
