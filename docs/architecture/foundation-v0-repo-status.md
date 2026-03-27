# Mini Tool Foundation v0 Repo Status

This document records current repo reality relative to the foundation v0 spec.

Use this document for:
- current transport and render-contract facts
- evidence strength when evaluating helper extraction
- identifying where current components do not yet satisfy the normative spec

Do not read this document as the normative contract for new components.
That contract lives in `docs/architecture/foundation-v0-spec.md`.

## Evidence tiers for extraction

### Tier A: normalized and commit-adapted

These components already participate in the normalized action pipeline and have explicit commit adaptation.
They are the strongest evidence for shared helper extraction.

- `approval-card`
- `option-list`
- `preferences-panel`
- `question-flow`
- `message-draft`

Caveat:
- `message-draft` is only partially semantically aligned because its adapter handles `send` and `cancel`, while the default registry classifies only `send` as a decision action.

### Tier B: normalized only

These components already participate in the normalized action pipeline but are not yet represented in the component-specific decision commit adapter set.

- `parameter-slider`

### Tier C: observational or specialized reference only

These components may still provide useful inspiration, but they are not direct evidence for consequential-action helper extraction.

- `progress-tracker`
- `chart`
- `instagram-post`
- `item-carousel`
- specialized viewers such as `code-block`, `code-diff`, `geo-map`, `image`, `terminal`, and related display-first components

## Current protocol baseline in code

Canonical runtime types:
- `MiniToolActionEnvelope` in `src/actions/types.ts`
- `DecisionReceipt` in `src/actions/types.ts`
- `MiniToolReceipt` in `src/shared/schema.ts`

Important current runtime facts:
- host/registry classification is authoritative for `MiniToolActionKind`
- current classification comes from `src/actions/registry/index.ts`
- `applyDecisionCommit()` exists as a generic passthrough helper, but several important components use bespoke adapters because their committed render contracts differ materially

## Current action ecosystem

### Registry participation

Current registry-covered components include:
- `approval-card`
- `option-list`
- `parameter-slider`
- `preferences-panel`
- `message-draft`
- `question-flow`
- observational/specialized event sources such as `chart`, `instagram-post`, and `item-carousel`

### Commit-adapter participation

Current component-specific commit adapters include:
- `approval-card`
- `message-draft`
- `option-list`
- `order-summary`
- `preferences-panel`
- `question-flow`

Notable gaps:
- `parameter-slider` is normalized but not currently represented in the component-specific decision commit adapter set
- `progress-tracker` is not a consequential-input seed and should not be counted as decision-commit evidence

## Current seed/component matrix

| Component | Archetype / role in foundation discussions | Current normalized action participation | Current commit adaptation | Current maturity notes |
| --- | --- | --- | --- | --- |
| `approval-card` | confirmer seed | yes | yes | component committed-render payload is scalar `"approved" | "denied"` in `choice`; adapter drops receipt metadata |
| `option-list` | selector seed | yes | yes | component committed-render payload remains `string | string[] | null` in `choice`; generic helper writes `receipt` and `choice` |
| `question-flow` | flow seed | yes | yes | durable host decision is `Record<string, string[]>`; component committed-render payload uses adapted summary-oriented `choice` |
| `progress-tracker` | tracker seed | no consequential decision pipeline by default | n/a | current component payload embeds `MiniToolReceipt`-shaped metadata in `choice`, but schema still requires `steps` and terminal rendering still shows the full step list |
| `preferences-panel` | broader consequential ecosystem evidence | yes | yes | preserves both `choice` and `receipt`; strong evidence for receipt-backed committed rendering patterns |
| `message-draft` | broader consequential ecosystem evidence | yes | yes | semantically partial because registry classifies only `send` as decision-backed |
| `parameter-slider` | broader consequential ecosystem evidence | yes | no component-specific adapter | useful for action normalization evidence, weaker for commit-render helper extraction |

## Current transport and committed-render facts by archetype

### Confirmer

Current seed:
- `approval-card`

Current durable host artifact:
- `DecisionReceipt<"approved" | "denied">`

Current component committed-render payload reality:
- the full payload renders `choice: "approved" | "denied"`
- embedded receipt metadata is not preserved in the component payload today

Implication:
- receipt-backed committed rendering for confirmers is not current seed reality yet

### Selector

Current seed:
- `option-list`

Current durable host artifact:
- `DecisionReceipt<string | string[] | null>`

Current component committed-render payload reality:
- the generic commit helper writes embedded receipt metadata plus `choice = receipt.decision`
- historical transport still distinguishes `string`, `string[]`, and `null`

Implication:
- the forward `{ selectedIds: string[] }` shape is not current seed transport yet
- maintainers must define the meaning of historical `null`

### Flow

Current seed:
- `question-flow`

Current durable host artifact:
- `DecisionReceipt<Record<string, string[]>>`

Current component committed-render payload reality:
- the commit adapter derives a summary-oriented `choice` payload
- original step definitions and option labels are needed during adaptation
- the durable host decision does not preserve step order directly in the stored decision shape

Implication:
- ordered `steps[]` remains a forward target for new components
- current seed behavior depends on a compatibility transport plus commit adaptation

### Tracker

Current seed:
- `progress-tracker`

Current terminal metadata reality:
- the current component payload embeds `MiniToolReceipt`-shaped data in `choice`

Current terminal render reality:
- summary-only replay is not supported
- terminal rendering still requires full payload state, including `steps`
- the component still renders the full step list in terminal mode

Implication:
- current tracker seed is renderable from full payload, not from a summary-only artifact

## Current event-shape reality

The normative spec defines a cleaner authoring helper shape for new components.
Current seeds still vary.

Important examples:
- `question-flow` emits only `{ answers }` and relies on the normalizer to synthesize `component`, `componentId`, and `actionId: "complete"`
- other normalized components often carry larger payload snapshots in `state`

Interpretation:
- large payload copies in normalized `state` exist in the repo today
- they should be treated as current implementation reality or compatibility baggage, not as proof that payload-wide state snapshots are ideal for new components

## Current replay realities

| Archetype | Durable commit artifact today | Current committed render dependency |
| --- | --- | --- |
| `confirmer` | `DecisionReceipt<"approved" | "denied">` | stable display fields if shown, plus scalar `choice` payload |
| `selector` | `DecisionReceipt<string | string[] | null>` | option labels/catalog for committed rendering |
| `flow` | `DecisionReceipt<Record<string, string[]>>` | original step definitions and option labels during commit adaptation |
| `tracker` | no summary-only canonical artifact today | full payload, including `steps`, for terminal rendering |

## Practical extraction implications

Use this repo-status reality when deciding helper scope.

Good extraction candidates:
- host-authoritative action classification integration
- deterministic event normalization helpers
- shared receipt-metadata creation helpers where multiple components truly share semantics
- proposed-vs-committed state helpers

Risky extraction candidates:
- one generic committed-payload adapter for all consequential components
- one generic tracker terminal artifact based on current `progress-tracker`
- selector helpers that collapse historical `null` without documenting its semantics
- flow helpers that treat the record transport as the ideal long-term shape for new components
