# Decision Commit Adapters

`mini-toolui/actions` provides `applyDecisionCommitByComponent(...)` to convert a committed decision receipt into a component-specific receipt payload.

Use this helper when component receipt contracts differ (`choice`, `outcome`, `variant`, structured summaries).

## API

```ts
import { applyDecisionCommitByComponent } from "mini-toolui/actions";

const nextPayload = applyDecisionCommitByComponent(component, payload, receipt, {
  allowGenericFallback: false,
  questionFlowTitle: "Project configured",
  questionFlowEmptyValueLabel: "None",
});
```

## Registered adapters

### `approval-card`

- Input decision: `"approved" | "denied"`
- Output payload updates:
  - `choice = receipt.decision`
- Notes:
  - Keeps payload shape simple and mirrors component contract.

### `option-list`

- Input decision: selected id(s)
- Output payload updates:
  - generic `applyDecisionCommit(...)`
  - writes `receipt`
  - writes `choice`

### `preferences-panel`

- Input decision: preferences value map
- Output payload updates:
  - `choice` as object copy of decision map
  - `receipt`
- Notes:
  - Uses object copy to avoid mutating shared references.

### `message-draft`

- Input action id:
  - `send` -> sent terminal state
  - `cancel` -> cancelled terminal state
- Output payload updates:
  - `outcome = "sent" | "cancelled"`
- Notes:
  - Does not write `choice`.
  - Component terminal behavior is outcome-driven.

### `question-flow`

- Input decision: answers map (`Record<string, string[]>`)
- Output payload updates:
  - `id` retained from payload (or receipt `componentId` fallback)
  - optional `role` retained
  - `choice = { title, summary[] }`
  - `receipt`
- Summary generation:
  - If `steps` exist, resolve selected option labels per step.
  - Otherwise, fall back to raw answer keys.
- Options:
  - `questionFlowTitle` (default: `"Completed"`)
  - `questionFlowEmptyValueLabel` (default: `"None"`)

### `order-summary`

- Input decision: optional `{ orderId, confirmedAt }`
- Output payload updates:
  - `variant = "receipt"`
  - `choice = { action: "confirm", orderId?, confirmedAt }`
- `confirmedAt` source priority:
  1. decision payload `confirmedAt`
  2. receipt timestamp `receipt.receipt.at`

## Unmapped components

By default, missing adapters throw:

- `No DecisionCommitAdapter is registered for component '...'`

You can opt into fallback behavior:

- set `allowGenericFallback: true`
- runtime will call generic `applyDecisionCommit(...)`.

## Recommendation

- Use `applyDecisionCommitByComponent(...)` as default for decision commits.
- Reserve `applyDecisionCommit(...)` for explicit simple `choice` payloads only.

## Copy-paste host snippets for tricky components

### `message-draft` (`outcome`-driven receipt state)

```ts
import {
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceiptFromAction,
} from "mini-toolui/actions";

const draft = document.querySelector("mini-tool-message-draft");

bindMiniToolActions(document, {
  onDecisionAction: (action) => createDecisionReceiptFromAction(action),
  commitDecision: (receipt) => {
    if (!draft || receipt.component !== "message-draft") {
      return;
    }

    draft.payload = applyDecisionCommitByComponent("message-draft", draft.payload, receipt);
  },
});
```

### `question-flow` (answers -> structured `choice.summary`)

```ts
import {
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceiptFromAction,
} from "mini-toolui/actions";

const flow = document.querySelector("mini-tool-question-flow");

bindMiniToolActions(document, {
  onDecisionAction: (action) =>
    createDecisionReceiptFromAction(action, {
      summary: "Question flow completed",
    }),
  commitDecision: (receipt) => {
    if (!flow || receipt.component !== "question-flow") {
      return;
    }

    flow.payload = applyDecisionCommitByComponent("question-flow", flow.payload, receipt, {
      questionFlowTitle: "Project configured",
      questionFlowEmptyValueLabel: "None",
    });
  },
});
```

### `order-summary` (`variant` + typed `choice`)

```ts
import {
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceiptFromAction,
} from "mini-toolui/actions";

const orderSummary = document.querySelector("mini-tool-order-summary");

bindMiniToolActions(document, {
  onDecisionAction: (action) =>
    createDecisionReceiptFromAction(action, {
      summary: "Order confirmed",
    }),
  commitDecision: (receipt) => {
    if (!orderSummary || receipt.component !== "order-summary") {
      return;
    }

    orderSummary.payload = applyDecisionCommitByComponent("order-summary", orderSummary.payload, receipt);
  },
});
```
