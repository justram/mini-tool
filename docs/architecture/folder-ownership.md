# Folder ownership

This document defines where code should live in `mini-tool`.

## Canonical structure

- `src/mini-tool/<component>/*`
  - Component-local implementation only.
  - Examples: component class, schema, component CSS, local helpers used by that component only.

- `src/shared/*`
  - Cross-component internal runtime modules.
  - Examples: schema primitives, validators, media/link sanitizers, icon helpers, syntax-highlighting assets, theme transition runtime helpers.
  - Shared internal CSS fragments must live under `src/shared/css-fragments/*` (not `src/shared/styles/*`).

- `src/styles/*`
  - Global public CSS assets exposed through package exports (for example `mini-tool/styles`).
  - Examples: base styles, shared theme tokens, transition styles.

- `src/types/*`
  - Ambient/global type declarations (`*.d.ts`).

## Rules

1. Do **not** create `src/mini-tool/shared/*`.
2. If two or more components use a module, place it under `src/shared/*`.
3. Keep component folders self-contained for component-specific logic only.
4. Keep global CSS in `src/styles/*` and global ambient typings in `src/types/*`.
5. Do not create `src/shared/styles/*`; use `src/shared/css-fragments/*` for internal CSS fragments.

## Enforcement

Architecture boundaries are enforced by:

- `npm run check`
- `npm run quality:gate` (includes the architecture boundary audit as a required step)

If you need the architecture audit in isolation, run:

- `npx tsx scripts/check-architecture-boundaries.ts`

If a boundary violation is introduced, these commands fail.
