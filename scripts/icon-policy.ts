export const GENERIC_ACTION_CONTROL_ICON_METHODS = [
  "renderLikeIcon",
  "renderShareIcon",
  "renderHeartIcon",
  "renderCopyIcon",
  "renderChevron",
  "renderOpenLinkIcon",
] as const;

export const PLATFORM_SEMANTIC_INLINE_SVG_METHODS: Readonly<Record<string, readonly string[]>> = {
  "src/mini-tool/instagram-post/instagram-post.ts": ["renderInstagramLogo", "renderVerifiedBadge"],
  "src/mini-tool/x-post/x-post.ts": ["renderXLogo", "renderVerifiedBadge"],
  "src/mini-tool/linkedin-post/linkedin-post.ts": ["renderLinkedInLogo"],
  "src/mini-tool/message-draft/message-draft.ts": ["renderSlackLogo"],
};

export const INLINE_SVG_LITERAL_ALLOWLIST = new Set([
  "src/mini-tool/instagram-post/instagram-post.ts",
  "src/mini-tool/linkedin-post/linkedin-post.ts",
  "src/mini-tool/message-draft/message-draft.ts",
]);
