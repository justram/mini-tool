# Testing and benchmark scaffold

This repository now includes a baseline quality harness for mini-tool library work:

- Unit/contract tests: Vitest
- Browser smoke tests: Playwright (Chromium)
- Micro-benchmarks: Hyperfine-driven contract parse comparisons with JSON + Markdown results

## Commands

```bash
npm install
npm run check
npm run test
npm run test:e2e
npm run package
npm run test:e2e -- tests/e2e/responsive-layout.spec.ts
npm run quality:gate
npm run quality:gate -- --component option-list
npm run quality:gate -- --component code-diff --summary-out ./tmp/quality-gate-code-diff-manual.json
npm run benchmark:source -- --component <name> --sha <tool-ui-commit-sha>
npm run benchmark
npm run benchmark:compare -- --component <name>
npm run benchmark:compare -- --component <name> --profile default
npm run benchmark:report
npx tsx benchmarks/runtime-breakdown.ts --profile quiet --variant mini --component <name>
npx tsx benchmarks/runtime-breakdown.ts --profile quiet --variant source --component <name>
npx tsx benchmarks/runtime-breakdown.ts --profile default --variant mini --component <name>
npx tsx benchmarks/runtime-breakdown.ts --runs 8 --warmup 2 --iterations 30 --variant mini --component <name>
npx tsx scripts/check-benchmark-readiness.ts
npx tsx scripts/prune-benchmark-artifacts.ts
npm run visual:compare -- --source <source-screenshot.png> --mini <mini-screenshot.png> --max-diff-percent 2
npm run visual:parity -- --component <name> --theme <light|dark> --source-url <source-url> --source-selector <selector> --source-index <n> --mini-url <mini-url> --mini-selector <selector> --mini-index <n> --max-diff-percent 2
npm run visual:bisect -- --component <name> --theme <light|dark> --source-url <source-url> --source-selector <selector> --mini-url <mini-url> --mini-selector <selector>
npm run verify
```

Script taxonomy:
- `check*` = static repository validation only
- `test*` = executable test suites
- `package*` = build and publish-surface validation
- `benchmark*` = high-level performance workflows only; specialized runtime/readiness/pruning tasks are direct CLI invocations

Benchmark tooling note:
- `npm run benchmark:compare` requires [`hyperfine`](https://github.com/sharkdp/hyperfine) installed locally.
- Contract benchmark metric is `contract.parse.<component>` (payload parse/validation path), driven by hyperfine.
- `npm run benchmark:compare` now defaults to the low-noise profile (`--profile quiet`) with higher runs/warmup, retry-on-noisy-trial behavior, cool-down between retries, and explicit coefficient-of-variation reporting in artifacts.
- For a faster directional run, pass `--profile default` explicitly: `npm run benchmark:compare -- --component <name> --profile default`.
- Quiet-profile CLI knobs:
  - `--max-retries <n>` retries when either variant exceeds noisy coefficient threshold (default quiet: `2`).
  - `--cool-down-ms <ms>` waits between retries (default quiet: `500`).
  - `--runs`, `--warmup`, `--iterations` remain overrideable for local tuning.
- Quiet-profile execution guidance is embedded in artifact notes (Linux pinning/governor tips, macOS low-background guidance) so reruns are reproducible instead of ad-hoc.
- The hyperfine task preloads both source and mini parsers and performs one untimed warm call before timing to reduce startup/JIT skew between variants.
- Source baseline adapters intentionally execute Tool-UI's native Zod schemas (`safeParse`) so source benchmark numbers reflect real source contract behavior instead of a normalized AJV adapter path.
- Benchmark component coverage is owned by one canonical registry (`benchmarks/component-registry.ts`), consumed by benchmark modules, mini-parser loaders, and source adapters; fixture integrity tests fail if any set drifts.
- Runtime benchmark (`npx tsx benchmarks/runtime-breakdown.ts`) measures browser-side lifecycle checkpoints with split phases: **Library Setup Readiness** (`defineReadyMs`), **Initial Card Paint Work** (`mountWorkAvgMs`), **Initial Card Paint Frame Wait** (`mountFrameAvgMs`), **Initial Card Paint Total** (`mountTotalAvgMs`), **Live Data Refresh Work** (`updateWorkAvgMs`), **Live Data Refresh Frame Wait** (`updateFrameAvgMs`), and **Live Data Refresh Total** (`updateTotalAvgMs`).
- Frame Wait is expected to be heavily influenced by browser scheduling (frame cadence, event loop pressure, host jitter). It is useful for user-perceived settle latency, but should not be treated as a pure component implementation-quality signal.
- Runtime breakdown defaults are still best run with `--profile quiet`: `runs=20`, `warmup=5`, `iterations=120`.
- For the former quick preset, pass `--profile default` explicitly.
- For the former dev preset, pass explicit knobs such as `--runs 8 --warmup 2 --iterations 30`.
- Runtime benchmark supports `--variant mini|source`; source runtime baseline coverage now matches all benchmark fixture components.
- `benchmark:report` first generates the latency overview, then renders a grouped, color-coded HTML report with two views: **Work View** (default, code-level signal) and **Total Latency View** (includes frame wait for perceived settle latency).
- Parse and runtime metrics are complementary; they should be interpreted per phase, not collapsed into a single number.
- Benchmark readiness checks and artifact pruning remain available as direct maintenance commands:
  - `npx tsx scripts/check-benchmark-readiness.ts`
  - `npx tsx scripts/prune-benchmark-artifacts.ts`
- Developer interpretation guide:
  - **Input Contract Check**: validation overhead per payload measured in microseconds; relevant for high-throughput data pipelines.
  - **Library Setup Readiness**: runtime startup cost (module import/evaluation and registration) before first use; this is separate from schema validation cost.
  - **Initial Card Paint Work / Frame Wait / Total**: separates render computation from frame scheduling so regressions are attributable.
  - **Live Data Refresh Work / Frame Wait / Total**: separates update computation from frame scheduling for interaction smoothness analysis.
  - For code-level optimization decisions, prioritize **Work** metrics; use **Frame Wait** as environment/scheduling context; use **Total** for user-perceived latency.

## What this scaffold validates today

- Contract-parity test shape (`tests/unit/contract-parity.test.ts`)
- Browser smoke flow for display and interactive patterns (`tests/e2e/*`)
- Semantic-parity assertions for high-risk content regressions (e.g. `tests/e2e/semantic-parity.spec.ts`)
- Reference-independent component quality gates in both themes, driven by `tests/e2e/quality-manifest.ts` (`tests/e2e/quality-gate.spec.ts`)
- `quality:gate` preflight enforces manifest coverage for every `mini-tool-*` component mounted in `example/index.html`
- `quality:gate` validates manifest quality profiles (`display` / `interactive`) and fails when required checks are missing
- `quality:gate` enforces smoke reset-button policy through manifest metadata (`requiresExternalReset`): required reset buttons must exist as `id="<component>-reset"`, and redundant reset buttons are rejected
- `quality:gate -- --component <name>` runs component-scoped type-check (`npx tsx scripts/typecheck-component.ts --component <name>`) before lint/e2e checks; full `quality:gate` (no component filter) runs repository-wide type-check (`tsc --noEmit`)
- `interactive` profile now requires keyboard-path coverage (`focus` or `press` actions) plus after-phase state assertions
- `quality:gate` emits a per-run JSON summary artifact for per-check pass/fail details
- `quality:gate -- --component <name>` runs component-scoped Oxlint on `src/mini-tool/<name>` (avoids repo-wide lint debt in non-release cycles)
- `package` validates the package-consumer surface by building dist artifacts, verifying exports/allowlists, and checking that `npm pack --dry-run` contains no `src/*` files
- `quality:gate` enforces layering policy: component CSS z-index declarations must use shared `--mt-layer-*` tokens and `position: fixed` selectors must be explicitly allowlisted (`scripts/quality-policy.ts`)
- `quality:gate` includes overlay integrity checks in manifest-driven E2E (`covers-viewport-min-ratio`, `topmost-at-point-within-host`) for modal/lightbox-style components
- Mandatory responsive overflow gate at 360px across smoke components (`tests/e2e/responsive-layout.spec.ts`)
- Smoke media/local-demo guardrails and layout-mode checks (`tests/e2e/smoke-media-fixtures.spec.ts`)
- Sparkline SVG namespace + area-fill semantic checks for stats-display (`tests/e2e/stats-display-visual.spec.ts`)
- Deterministic benchmark fixtures (`benchmarks/fixtures/*`)
- Source baseline artifacts from `../tool-ui` contracts (`benchmarks/results/source-baseline/*.json|*.md`)
- Baseline benchmark output artifacts (`benchmarks/results/*.json|*.md`)
- Comparison summaries with gate verdicts (`benchmarks/results/comparisons/*.json|*.md`)
- Runtime latency breakdown artifacts (`benchmarks/results/runtime/*.json|*.md`)
- Combined user-facing latency overview artifacts

## Validation guidance

- `npm run quality:gate -- --component <name>` remains the primary component-scoped validation workflow.
- `npm run visual:parity` and `npm run visual:compare` remain available for targeted visual investigations.
- `npm run visual:bisect` remains available for layered visual debugging when isolating rendering regressions.

## What to replace over time

- Evolve the `example/` app into the production documentation demo surface (or replace with docs-integrated playground)
- Replace placeholder schemas with finalized component schemas where needed
- Extend benchmarks to include real component render/update timings
- Add additional E2E scenarios as components evolve
