# Actions Runtime API

`mini-toolui/actions` provides a single host-side integration point for handling interactive component events.

## Why this exists

Mini-tool components emit custom DOM events. Without a runtime adapter, host apps have to wire each event type separately and re-implement action classification and receipt logic.

The actions runtime solves this by normalizing supported events into one envelope and splitting behavior into:

- terminal decision states should remain visible as receipt UI (do not hide the component after a final decision)

- `local` actions: in-context side effects only
- `decision` actions: consequential outcomes that should be committed as durable receipts

## Quick start

```ts
import {
  bindMiniToolActions,
  createDecisionReceiptFromAction,
  type DecisionReceipt,
} from "mini-toolui/actions";

const unbind = bindMiniToolActions(document, {
  onLocalAction: async (action) => {
    // non-consequential side effects only
  },
  onDecisionAction: async (action): Promise<DecisionReceipt> => {
    return createDecisionReceiptFromAction(action, {
      summary: `${action.component}:${action.actionId}`,
    });
  },
  commitDecision: async (receipt) => {
    // commit to your runtime / event store / addResult equivalent
  },
});

// later
unbind();
```

## Full decision commit loop example

```ts
import {
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceiptFromAction,
} from "mini-toolui/actions";

const approvalCard = document.querySelector("mini-tool-approval-card");
if (!approvalCard) {
  throw new Error("Missing approval card element.");
}

const initialPayload = {
  id: "approval-1",
  title: "Deploy release",
  description: "Deploy v1.8.2 to production?",
};

approvalCard.payload = structuredClone(initialPayload);

const unbind = bindMiniToolActions(document, {
  onLocalAction: () => {
    // no-op for this example
  },
  onDecisionAction: (action) => {
    return createDecisionReceiptFromAction(action, {
      summary: `Decision: ${action.component}.${action.actionId}`,
    });
  },
  commitDecision: (receipt) => {
    // persist decision result to your runtime/event store first
    // then reflect committed state back into component payload
    approvalCard.payload = applyDecisionCommitByComponent("approval-card", approvalCard.payload, receipt);
  },
});

// later
unbind();
```

## Action envelope

Every normalized event is exposed as:

- `component`: normalized component name (e.g. `option-list`)
- `componentId`: resolved from `detail.componentId`, `detail.payload.id`, or composed path dataset/id
- `actionId`: normalized action identifier
- `kind`: `local | decision`
- `state`: normalized post-action state snapshot
- `decision`: optional decision payload
- `rawEvent`: original DOM event

## Default decision classification

By default, these actions are `decision`:

- `approval-card.confirm`
- `approval-card.cancel`
- `message-draft.send`
- `option-list.confirm`
- `parameter-slider.apply`
- `preferences-panel.save`
- `question-flow.complete`

All other supported actions default to `local`.

Use `classificationOverride` to override defaults.

## Supported normalized events

- `mini-tool:approval-card-action`
- `mini-tool:option-list-action`
- `mini-tool:parameter-slider-action`
- `mini-tool:preferences-panel-action`
- `mini-tool:chart-data-point-click`
- `mini-tool:instagram-post-action`
- `mini-tool:item-carousel-action`
- `mini-tool:item-carousel-item-click`
- `mini-tool:message-draft-action`
- `mini-tool:question-flow-complete`

See also: `docs/actions-decision-commit-adapters.md` for per-component adapter behavior.

## Decision commit helpers

### `createDecisionReceipt(...)`
Build a typed decision receipt directly.

### `createDecisionReceiptFromAction(action, options?)`
Convert a normalized decision action to a receipt envelope.

Precondition:
- `action.kind` must already be `"decision"`
- `action.decision` must contain the canonical committable decision payload for that action

Current runtime note:
- the helper forwards `action.decision` without additional validation
- if host classification is overridden incorrectly or a malformed normalizer produces a decision action without a decision payload, the resulting receipt may carry `decision: undefined`
- hosts that need stronger guarantees should validate decision presence before calling this helper

### `applyDecisionCommitByComponent(component, payload, receipt, options?)`
Apply a decision commit using the registered `DecisionCommitAdapter` for the target component.

Use this as the default helper for heterogeneous component receipt contracts (`choice` vs `outcome` vs `variant`).

### `applyDecisionCommit(payload, receipt, options?)`
Low-level generic helper for simple `choice`-style payloads.

- always writes `payload.receipt`
- writes `payload.choice` by default (configurable)

## Error handling behavior

If a `decision` action is received and `onDecisionAction` is not provided, `bindMiniToolActions` throws asynchronously.

Provide `onError` in options to capture and handle runtime errors explicitly.
