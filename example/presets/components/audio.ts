import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyAudioInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "audio-preview-full",
    assetId: "audio-full",
    src: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3",
    title: "Morning Forest",
    description: "Dawn chorus recorded in Olympic National Park",
    artwork: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&auto=format&fit=crop",
    durationMs: 42000,
  };

  element.variant = "full";
}
