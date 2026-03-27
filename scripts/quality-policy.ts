export const HARD_CODED_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/g;

export const INLINE_SVG_LITERAL_PATTERN =
  /\b(?:fill|stroke|stop-color)\s*=\s*["'][^"']*(?:#|rgb\(|rgba\(|hsl\(|hsla\()/i;

export const Z_INDEX_DECLARATION_PATTERN = /\bz-index\s*:\s*([^;]+);/gi;
export const POSITION_FIXED_PATTERN = /\bposition\s*:\s*fixed\s*;/i;

export const LAYER_TOKEN_PREFIX = "--mt-layer-";

export const FIXED_POSITION_ALLOWLIST = new Set([".lightbox"]);
