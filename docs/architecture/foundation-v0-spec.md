# Mini Tool Foundation v0 Spec

This document is the normative v0 contract for new foundation-aligned components.

Use this document for:
- authoring new protocol-first components
- evaluating whether a shared helper belongs in `src/shared/foundation/*`
- reviewing whether a proposed component contract is sufficiently deterministic

Normative language:
- must = required for new foundation-aligned components
- should = recommended default; deviation requires explicit justification
- may = optional

Do not use this document as the primary source for current repo quirks or compatibility gaps.
Use instead:
- `docs/architecture/foundation-v0-repo-status.md`

## Scope

Foundation v0 standardizes:
- protocol-surface archetypes
- authority boundaries between component, normalizer, registry, host, and commit adapter
- semantic meaning of action detail fields
- replay levels and durable commit artifacts
- extraction criteria for shared helpers

Foundation v0 does not standardize:
- one visual shell for every component
- one base class for every component
- one generic commit adapter for every archetype
- specialized viewer components that do not benefit from this protocol layer

## Canonical baseline

All new foundation-aligned consequential components, action-participating trackers, and shared helpers for the action/commit pipeline must map cleanly to the existing repo protocol baseline:

- `MiniToolActionEnvelope` from `src/actions/types.ts`
- `DecisionReceipt` from `src/actions/types.ts`
- `MiniToolReceipt` from `src/shared/schema.ts`

Payload-bound trackers that do not emit actions and do not declare a standalone terminal artifact are exempt from the `MiniToolActionEnvelope` / `DecisionReceipt` portion of this baseline, but still need to align with the shared terminology and replay rules in this spec.

Interpretation rules:
- if a consequential-action helper cannot map cleanly into `MiniToolActionEnvelope` and `DecisionReceipt`, it is not ready
- `MiniToolReceipt` is metadata, not the whole committed artifact
- `applyDecisionCommit()` is a low-level convenience helper, not a normative foundation primitive
- machine interpretation must rely on committed decision/state data and artifact structure, not on human-readable `receipt.summary`

Terminology:
- durable host artifact = host-storable committed artifact, typically `DecisionReceipt<TDecision>`
- component committed-render payload = payload shape consumed when rendering committed state
- full payload = complete serialized component instance payload
- embedded receipt metadata = `MiniToolReceipt`-shaped data carried inside a component payload rather than standing alone as the whole artifact

## Authority boundaries

### Component

The component owns:
- payload schema
- local proposed state
- deterministic event emission
- committed rendering according to its declared contract

### Normalizer

The normalizer owns:
- conversion from component-scoped custom event detail into `MiniToolActionEnvelope`
- synthesis of metadata that the component may not currently emit directly during compatibility transitions
- attachment of `rawEvent`

### Registry

The registry owns:
- default action classification as `"local"` or `"decision"`
- component/action policy for the shared host pipeline

Host/registry classification is authoritative.
New component authoring helpers must not create a second source of truth for action kind.

### Host

The host owns:
- whether a decision action is committed
- creation of `DecisionReceipt`
- persistence of the durable host artifact

### Commit adapter

The commit adapter owns:
- projection from the durable host artifact into the component committed-render payload
- compatibility handling for legacy transport shapes during transitions

Compatibility belongs at adapter boundaries, not in new component payload schemas.

## Protocol-surface families

### Consequential input surfaces

Archetypes:
- `confirmer`
- `selector`
- `flow`

Required guarantees for new foundation-aligned components:
1. strict payload schema
2. deterministic component-scoped event detail
3. normalized mapping into `MiniToolActionEnvelope`
4. explicit proposed vs committed semantics
5. durable host artifact and component committed-render payload defined in the component contract

### Observational state surfaces

Archetypes:
- `tracker`

Required guarantees for new foundation-aligned components:
1. strict payload schema
2. explicit state vocabulary
3. stable rendering from the full serialized payload contract
4. terminal summary contract defined explicitly when applicable

Terminology:
- renderable from full payload: the component can render from its full serialized payload
- renderable from committed artifact: the component can render from its declared durable host artifact or another declared render artifact without consulting the original live payload
- renderable from summary-only artifact: the component can render a terminal summary view without additional live-state payload

## Shared state model

### Proposed state

Mutable local state the user is still editing.

Rules:
- component-owned only
- not host-persisted
- may be richer than the final committed result

### Committable state

A predicate over proposed state indicating whether submission is valid.

Rules:
- derived from proposed state plus payload constraints
- not a separate durable artifact

### Committed state

The minimal machine-meaningful result of a consequential action.

Rules:
- host-owned once accepted
- serializable and deterministic
- must not depend on DOM identity or hidden runtime references

### Receipt state

A durable host-storable artifact derived from committed state plus stable metadata.

Rules:
- host-owned
- may include presentation-friendly metadata
- is never an independent source of truth separate from committed state
- is not automatically a self-sufficient render artifact

## Contract layers

Foundation v0 distinguishes three separate layers for consequential components.

### 1. Emitted event detail

What the component emits before normalization.

Required purpose:
- describe deterministic local state and canonical committable intent for the action being emitted

### 2. Durable host decision artifact

What the host persists after committing the action.

Typical form:
- `DecisionReceipt<TDecision>`

Required purpose:
- preserve the committed decision/state plus stable receipt metadata

### 3. Component committed-render payload

What the component consumes when rendering its committed state.

Required purpose:
- provide the declared committed view contract for that component instance

Layer rules:
- archetype decision shapes apply to the durable host artifact layer unless explicitly stated otherwise
- component committed-render payloads may wrap, transform, or enrich that decision shape for rendering
- if committed rendering needs stable display metadata not present in `DecisionReceipt<TDecision>`, that metadata must live in the declared committed-render payload
- original live payload data must not become an implicit render dependency unless the component explicitly claims only Level 1 support

## Event semantics

For new foundation-aligned components, event detail must use an authoring shape equivalent to:

```ts
interface MiniToolActionDetail<TState = unknown, TDecision = unknown> {
  component: string;
  actionId: string;
  componentId: string;
  state: TState;
  decision?: TDecision;
  context?: Record<string, unknown>;
}
```

Field semantics:
- `decision`
  - minimal committable user intent
  - the value that should survive into the host commit artifact when the action is consequential
- `state`
  - serializable local/proposed-state snapshot relevant to handlers and normalization
  - may include enough structured data to support validation, previews, or adapters
  - must not be treated as the canonical committed result unless the contract says so explicitly
- `context`
  - non-authoritative supporting metadata
  - useful for inspection, analytics, or host convenience before or during normalization
  - must not be the only source of machine-meaningful committed semantics

Rules:
- consequential input surfaces must emit `decision`
- observational surfaces or non-consequential actions may omit `decision`
- for consequential surfaces, `decision` is the canonical committable intent
- for new foundation-aligned components, normalizers may enrich metadata but must not derive the canonical committable decision from `state`
- `context` has no first-class field in `MiniToolActionEnvelope`; in v0 it is pre-normalization metadata only
- normalizers may copy selected `context` fields into `state` only when they are needed as durable handler input and remain structured/serializable
- otherwise `context` may be discarded during normalization
- full payload copies inside `state` are transition-only unless explicitly justified by a stable handler need
- `decision` should be smaller and more stable than `state`
- `context` must be structured serializable data only
- event detail must not use DOM nodes, callbacks, or object identity as protocol data

## Role semantics

For new foundation-aligned components, top-level component instance payloads should include:
- `id: string`
- `role: "decision" | "control" | "state" | "composite" | "information"`

This guidance applies to component instance payloads, not to minimal decision payloads or host commit artifacts.

`role` policy in v0:
- `role` is descriptive metadata and an inspection hint first
- hosts may use it as a soft hint for layout, grouping, inspection UIs, or tooling presentation
- `role` should improve inspection and layout consistency, not become the primary behavioral discriminator for action semantics or commit logic

## Archetype contracts

### Confirmer

Purpose:
- capture a consequential approval/deny/acknowledgement style decision

Normative durable decision contract:
- explicit confirmer decision payload with a durable outcome enum
- receipt metadata when the host commits

Committed-render payload:
- component-defined, but it must preserve or embed the confirmer decision contract needed for machine interpretation

Minimal v0 confirmer shape:

```ts
{ outcome: "approved" | "denied" }
```

Optional extension:
- a confirmer may add `"cancelled"` only if cancellation is itself a durable committed outcome in that component contract

Required invariants:
- boolean-only confirmer contracts are not sufficient for foundation-aligned components
- if cancellation is supported, the contract must say whether it is a local abandon action or a committed decision outcome
- machine interpretation must rely on the explicit outcome value, not on button labels or summary text

Replay requirement:
- committed rendering may depend on stable display fields shown by the committed view
- machine interpretation must rely on the committed decision payload, not summary text

### Selector

Purpose:
- capture deterministic selection from a bounded option set

Normative durable decision contract:

```ts
{ selectedIds: string[] }
```

Committed-render payload:
- component-defined, but it must preserve or embed the selector decision contract needed for machine interpretation

Required semantic distinctions where they differ:
- committed empty selection: `selectedIds: []`
- uncommitted local state
- cancelled committed outcome, if cancellation itself is durable
- local clear/reset behavior that does not produce a committed artifact

Replay requirement:
- committed rendering may depend on an option catalog or equivalent stable label map

### Flow

Purpose:
- capture ordered multi-step structured input

Normative durable decision contract:

```ts
{ steps: Array<{ stepId: string; answers: string[] }> }
```

Committed-render payload:
- component-defined, but it must preserve or embed the flow decision contract needed for machine interpretation

Guaranteed by the minimal v0 shape:
- step order is preserved in committed data
- answer order is preserved when represented in the array values

Not guaranteed automatically by the minimal v0 shape:
- skipped vs unanswered distinction
- auto-filled vs user-selected distinction
- partial-completion status

If a flow needs those distinctions to be durable, it must extend the per-step shape explicitly.

Replay requirement:
- original payload must not be the semantic source of step ordering for new flow contracts

### Tracker

Purpose:
- expose live or terminal observational state in a human-reviewable form

Supported tracker modes:
- payload-bound tracker
  - renders terminal state from the full component payload only
  - no standalone host-storable terminal artifact is required
- artifact-backed tracker
  - declares a terminal artifact contract for committed-artifact rendering
  - may additionally support summary-only rendering

Normative terminal contract for new components:
- the component must declare which tracker mode it uses
- if it is artifact-backed, it must define the terminal artifact contract explicitly
- if it claims summary-only replay, it must not require additional live-state payload for that terminal summary view

## Replay levels

Every new foundation-aligned component must document which replay level it supports.

### Level 1: Durable commit artifact

The minimum host-storable artifact that preserves committed result plus stable metadata.

Typical form:
- `DecisionReceipt<TDecision>` for consequential input surfaces
- component-specific terminal artifact for artifact-backed trackers

Level 1 does not automatically imply self-sufficient committed rendering.

### Level 2: Self-sufficient render artifact

An artifact sufficient to render the committed view without consulting the original payload.

This is stricter than durable storage.
A component should not imply Level 2 support unless its contract actually provides it.

Operational rule:
- if committed rendering requires stable display metadata not present in `DecisionReceipt<TDecision>`, that metadata must be carried in the declared committed-render payload or another declared render artifact
- it must not be implicitly sourced from the original live payload unless the component explicitly claims only level-1 durable storage and does not claim self-sufficient replay

## Canonical implementation table

| Archetype | Event detail | Durable host artifact | Committed-render payload | Receipt metadata | Replay level |
| --- | --- | --- | --- | --- | --- |
| `confirmer` | deterministic action identity + `{ outcome: "approved" | "denied" }` or documented extension | `DecisionReceipt<{ outcome: "approved" | "denied" }>` or documented extension | component-defined payload that preserves or embeds the confirmer decision contract | component-defined; may be embedded if the committed view uses it | Level 1 |
| `selector` | deterministic action identity + `{ selectedIds: string[] }` | `DecisionReceipt<{ selectedIds: string[] }>` | component-defined payload that preserves or embeds the selector decision contract | component-defined; may be embedded if needed | Level 1 |
| `flow` | deterministic action identity + ordered flow decision | `DecisionReceipt<{ steps: Array<{ stepId: string; answers: string[] }> }>` | component-defined payload that preserves or embeds the flow decision contract | component-defined; display metadata must be declared in the render payload for Level 2 claims | Level 1 |
| `tracker` | optional; only if the tracker emits actions | payload-bound: none required; artifact-backed: component-defined terminal artifact | component-defined terminal payload | component-defined | None, Level 1, or Level 2, explicitly declared |

## Shared runtime extraction rules

A helper belongs in `src/shared/foundation/*` only if:
1. at least two components already need it
2. it reduces protocol ambiguity, not just code length
3. it improves determinism, inspectability, or replay clarity
4. it aligns cleanly with `MiniToolActionEnvelope`, `DecisionReceipt`, and `MiniToolReceipt`
5. it does not force specialized viewers into consequential-input semantics

### `events.ts`

May contain:
- deterministic action-detail helpers
- normalization helpers into `MiniToolActionEnvelope`
- host-authoritative action-classification integration

Must not contain:
- a parallel final transport type
- component-authoritative `kind` semantics

### `receipts.ts`

May contain:
- durable host artifact helpers
- receipt-metadata helpers
- shared summary/outcome helpers where the semantics are genuinely shared

Must not contain:
- forced generic commit adaptation for components with materially different committed render contracts

### `state.ts`

May contain:
- proposed-state initialization/reset helpers
- committable guards
- deterministic state snapshot helpers

### `accessibility.ts`

May contain:
- keyboard/focus helpers proven across multiple components
- shared labeling helpers for committed/receipt rendering

## Evolution

Foundation v0 intentionally keeps archetype decision contracts small.

Evolution rule:
- component-specific payload versioning is optional in v0
- once committed-render payloads or terminal artifacts are persisted across releases, explicit versioning is recommended
- future shape expansion should prefer additive fields or explicit version bumps over silent semantic reinterpretation

## Evidence threshold for extraction

The normative extraction rule is the five criteria above.
The repo-status document is supporting evidence only; it is not part of the normative contract.

A proposed helper should not be extracted just because one seed needs it.
It should survive comparison across the broader protocol ecosystem, not just the four seed archetypes.
