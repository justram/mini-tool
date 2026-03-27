import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyItemCarouselInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "item-carousel-recommendations",
    items: [
      {
        id: "rec-1",
        name: "Deadwood",
        subtitle: "HBO · 2004",
        color: "#8b6f47",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
      {
        id: "rec-2",
        name: "The Wire",
        subtitle: "HBO · 2002",
        color: "#1e293b",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
      {
        id: "rec-3",
        name: "Twin Peaks",
        subtitle: "ABC · 1990",
        color: "#7f1d1d",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
      {
        id: "rec-4",
        name: "The Simpsons",
        subtitle: "Fox · 1989",
        color: "#fbbf24",
        actions: [{ id: "add", label: "Add to List" }],
      },
      {
        id: "rec-5",
        name: "Mad Men",
        subtitle: "AMC · 2007",
        color: "#c2410c",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
      {
        id: "rec-6",
        name: "Peep Show",
        subtitle: "Channel 4 · 2003",
        color: "#1e40af",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
      {
        id: "rec-7",
        name: "The Sopranos",
        subtitle: "HBO · 1999",
        color: "#991b1b",
        actions: [
          { id: "info", label: "Details", variant: "secondary" },
          { id: "watch", label: "Watch" },
        ],
      },
    ],
  };
}
