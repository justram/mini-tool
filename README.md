# mini-tool

Lit-based mini tool components for host applications.

## Consumer API

This package publishes a stable, consumer-focused surface for:

- shared mini-tool styles
- component registration via subpath exports
- action/runtime helpers for host integration

## Consumer stylesheet entry

For host apps, import the official shared stylesheet entry once at app startup:

```ts
import "mini-toolui/styles";
```

This entry provides base/theme tokens (including shared `--mt-layer-*` stacking tokens) required for predictable cross-component layering and theming.

Component modules are also available through stable subpath exports:

```ts
import "mini-toolui/components/image-gallery";
import "mini-toolui/components/geo-map";
```

For host action handling, use the runtime helpers export (full guide: `docs/actions-runtime.md`):

```ts
import { bindMiniToolActions, createDecisionReceiptFromAction } from "mini-toolui/actions";

const unbind = bindMiniToolActions(document, {
  onLocalAction: async (action) => {
    // local side effects only
  },
  onDecisionAction: async (action) => {
    // convert consequential action into a durable receipt envelope
    return createDecisionReceiptFromAction(action, {
      summary: `${action.component}:${action.actionId}`,
    });
  },
  commitDecision: async (receipt) => {
    // commit to your runtime/addResult/event store
  },
});
```

Public package surface is intentionally limited to these exports. Paths under `src/*` are internal implementation details and are not supported for consumer imports. Package exports resolve to built `dist/*` artifacts only.

## Attribution

This library explicitly credits [`assistant-ui/tool-ui`](https://github.com/assistant-ui/tool-ui) as the upstream design and component inspiration. `mini-toolui` is the rewritten Lit-based library form maintained in this repository.

## Maintainer documentation

The repository still includes internal engineering documentation for maintainers.

- Actions runtime API: `docs/actions-runtime.md`
- Testing and benchmarks: `docs/testing-and-benchmarks.md`
- Folder ownership and architecture boundaries: `docs/architecture/folder-ownership.md`
- Foundation v0 architecture entry point: `docs/architecture/foundation-v0.md`
- Foundation v0 normative spec for new protocol-first components: `docs/architecture/foundation-v0-spec.md`
- Foundation v0 current repo status/evidence matrix: `docs/architecture/foundation-v0-repo-status.md`
- Decision commit adapter matrix: `docs/actions-decision-commit-adapters.md`
- Icon policy and Lucide audit scope: `docs/architecture/icon-policy.md`

## Core commands

### Lint

- `npm run lint` — repo-wide Oxlint validation
- `npm run lint:fix` — format the repo, then apply safe Oxlint fixes
- `npm run format` — format the repository with Oxfmt
- `npm run format:check` — verify repository formatting with Oxfmt

### Check

- `npm run check` — repository validation only (lint, typecheck, architecture/import/tracking checks; no tests)

### Test

- `npm run test` — unit/contract tests (Vitest)
- `npm run test:e2e` — browser/e2e tests (Playwright)
- `npm run test:e2e:ui` — open Playwright UI mode

### Package

- `npm run build` — build published dist artifacts
- `npm run package` — build then validate package artifacts (including npm pack surface)

### Dev

- `npm run dev` — run the example app on `http://127.0.0.1:4173`
- `npm run dev:build` — build the example app for static hosting
- `npm run dev:preview` — preview the built example app on `http://127.0.0.1:4173`

### Maintainer validation and internal workflows

- `npm run benchmark` — mini benchmark suite
- `npm run benchmark:source -- --component <name> --sha <tool-ui-commit-sha>` — source baseline benchmark
- `npm run benchmark:compare -- --component <name>` — low-noise hyperfine profile (`--profile quiet`)
- `npm run benchmark:report` — build the latency overview and render the HTML report
- `npm run quality:gate -- --component <name> --skip-contract` — component quality gate
- `npm run tracking:check -- --component <name>` — verify readiness evidence for a component
- `npm run visual:bisect -- --component <name> --source-url <source-url> --source-selector <selector> --mini-url <mini-url> --mini-selector <selector>` — layer bisect utility for visual regression debugging
- `npm run verify` — full validation (`check` + `test` + `test:e2e`)

Script conventions:
- `lint*` = formatting/style validation
- `check*` = static/repository validation only
- `test*` = executable test suites
- `package*` = dist/packaging workflows
- `dev*` = local development entrypoints
- `benchmark*` = high-level performance workflows only; use direct CLI flags/scripts for specialized benchmark diagnostics
- `visual*` / `*gate` = operational workflows that are still intentionally exposed
- `verify` = all-up validation before release

For benchmark internals and schema adapter details (including native source Zod adapter behavior), see `docs/testing-and-benchmarks.md`.
