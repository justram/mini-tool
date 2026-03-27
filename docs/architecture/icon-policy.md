# Icon policy

This project uses a two-lane icon policy so we keep both consistency and platform-preview fidelity.

## Lane A: Generic action/control/status icons (shared Lucide required)

For generic UI icons (like/share/copy/chevron/open-link), use:

- `lucide` icon imports
- `renderLucideIcon(...)` from `src/shared/icons/lucide`

Inline `<svg>` is forbidden for these generic methods.

Current enforced generic methods are defined in:

- `scripts/icon-policy.ts` → `GENERIC_ACTION_CONTROL_ICON_METHODS`

## Lane B: Platform-semantic preview glyphs (inline SVG required)

For platform-specific preview semantics (brand marks, platform verification badge silhouettes, etc.), inline SVG is required.
These glyphs intentionally preserve platform look and must not be replaced by generic Lucide approximations.

Current enforced platform-semantic methods are defined in:

- `scripts/icon-policy.ts` → `PLATFORM_SEMANTIC_INLINE_SVG_METHODS`

Examples:

- Instagram verified badge and logo
- X verified badge and logo
- LinkedIn logo
- Slack logo in message draft

## Brand/logo literal color allowlist

Literal SVG color attributes (`fill`, `stroke`, `stop-color`) are audited by `quality:gate` for all `src/mini-tool/**/*.ts` files.

Current explicit allowlist is defined in:

- `scripts/icon-policy.ts` → `INLINE_SVG_LITERAL_ALLOWLIST`

Policy:

- New literal-color inline SVG usage outside this allowlist is rejected by quality gate.
- To add a new exception, update both:
  - `scripts/icon-policy.ts`
  - this document (with rationale).
- Prefer tokenized/themed colors whenever brand fidelity is not mandatory.

## Enforcement

- `npm run quality:gate` runs icon audits.
- The audit enforces both lanes:
  - Generic action/control icon methods: shared Lucide required.
  - Platform-semantic methods: inline SVG required.
