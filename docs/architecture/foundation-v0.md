# Mini Tool Foundation v0

This document is the entry point for the foundation v0 architecture set.

The previous single-document draft mixed multiple concerns too heavily:
- normative contract for new components
- current repo reality
- planning and compatibility notes for seeds and adjacent components

That made it harder to answer a simple question on first read:
- is this required for new work, merely true in the repo today, or only a forward target?

Foundation v0 is now split into three focused documents.

## How to read this doc set

### 1. Normative contract for new components

Read this first when designing or reviewing a new protocol-first component:
- `docs/architecture/foundation-v0-spec.md`

Use it for:
- archetype contracts
- authority boundaries
- event semantics
- replay levels
- extraction rules for shared helpers

### 2. Current repo compatibility and evidence

Read this when evaluating whether a helper is actually proven by the current codebase:
- `docs/architecture/foundation-v0-repo-status.md`

Use it for:
- current transport and committed-render facts
- evidence tiers for helper extraction
- current seed/component mismatches
- action-pipeline and commit-adapter coverage

### 3. Planning and compatibility notes

Use the spec and repo-status documents together when planning alignment work for seeds or adjacent components.

## Short summary

Foundation v0 remains intentionally lightweight.

It standardizes:
- protocol-surface archetypes
- deterministic action normalization
- durable commit artifacts
- replay terminology
- extraction guardrails for shared helpers

It does not require:
- a universal base class
- a visual rewrite of existing components
- immediate alignment of every current seed to the forward target contract

## Canonical baseline

All foundation work must still map cleanly to the current repo protocol baseline:
- `MiniToolActionEnvelope`
- `DecisionReceipt`
- `MiniToolReceipt`

Authority boundaries are unchanged:
- components emit deterministic custom events
- normalizers map events into `MiniToolActionEnvelope`
- the registry/host remains authoritative for action-kind classification
- the host decides whether to commit
- commit adapters project host artifacts into committed component payloads

## Recommended reading order

1. `foundation-v0-spec.md`
2. `foundation-v0-repo-status.md`

## Approval bar

Treat `foundation-v0-spec.md` as the implementation-facing contract.
Treat the other two documents as grounding and planning material.

If a statement appears in the repo-status document but not in the spec, it should not be read as a normative requirement for new components.
