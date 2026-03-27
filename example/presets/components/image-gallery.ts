import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyImageGalleryInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "image-gallery-search-results",
    title: "Mountain landscapes",
    description: "Here are some images matching your search",
    images: [
      {
        id: "img-1",
        src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
        alt: "Dramatic mountain peaks at sunrise with golden light",
        width: 800,
        height: 600,
        title: "Alpine Sunrise",
        caption: "Dolomites, Italy",
        source: { label: "Unsplash", url: "https://unsplash.com" },
      },
      {
        id: "img-2",
        src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=1200&fit=crop",
        alt: "Misty mountain valley with evergreen trees",
        width: 800,
        height: 1200,
        title: "Misty Valley",
        source: { label: "Unsplash", url: "https://unsplash.com" },
      },
      {
        id: "img-3",
        src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop",
        alt: "Snow-covered mountain peak under starry night sky",
        width: 800,
        height: 600,
        title: "Night Summit",
        caption: "Mount Hood, Oregon",
      },
      {
        id: "img-4",
        src: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=600&fit=crop",
        alt: "Reflection of mountains in a crystal clear lake",
        width: 800,
        height: 600,
      },
      {
        id: "img-5",
        src: "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&h=1000&fit=crop",
        alt: "Hiker standing on mountain ridge at sunset",
        width: 800,
        height: 1000,
        title: "Summit View",
      },
    ],
  };
}
