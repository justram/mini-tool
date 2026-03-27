import { describe, expect, it } from "vitest";
import {
  applyDecisionCommit,
  applyDecisionCommitByComponent,
  bindMiniToolActions,
  createDecisionReceipt,
  createDecisionReceiptFromAction,
  resolveActionKind,
} from "../../src/actions";

describe("actions runtime", () => {
  it("classifies default action kinds", () => {
    expect(resolveActionKind("option-list", "confirm")).toBe("decision");
    expect(resolveActionKind("option-list", "cancel")).toBe("local");
    expect(resolveActionKind("message-draft", "send")).toBe("decision");
    expect(resolveActionKind("question-flow", "complete")).toBe("decision");
    expect(resolveActionKind("chart", "point-click")).toBe("local");
  });

  it("supports classification overrides", () => {
    const kind = resolveActionKind("option-list", "confirm", {
      "option-list.confirm": "local",
    });

    expect(kind).toBe("local");
  });

  it("routes local actions through onLocalAction", async () => {
    const target = new EventTarget();
    let seenActionId: string | null = null;

    const unbind = bindMiniToolActions(target, {
      onLocalAction: (action) => {
        seenActionId = action.actionId;
      },
    });

    target.dispatchEvent(
      new CustomEvent("mini-tool:parameter-slider-action", {
        detail: {
          actionId: "reset",
          values: [{ id: "speed", value: 42 }],
          payload: { id: "slider-1" },
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    unbind();

    expect(seenActionId).toBe("reset");
  });

  it("routes decision actions and commits receipts", async () => {
    const target = new EventTarget();
    const committed: string[] = [];

    const unbind = bindMiniToolActions(target, {
      onDecisionAction: (action) =>
        createDecisionReceiptFromAction(action, {
          summary: "Selection confirmed",
        }),
      commitDecision: (receipt) => {
        committed.push(`${receipt.component}.${receipt.actionId}`);
      },
    });

    target.dispatchEvent(
      new CustomEvent("mini-tool:option-list-action", {
        detail: {
          actionId: "confirm",
          value: ["small"],
          payload: { id: "option-list-1" },
        },
      }),
    );

    target.dispatchEvent(
      new CustomEvent("mini-tool:question-flow-complete", {
        detail: {
          componentId: "question-flow-1",
          answers: { size: ["m"] },
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    unbind();

    expect(committed).toEqual(["option-list.confirm", "question-flow.complete"]);
  });

  it("normalizes non-action events into local action envelopes", async () => {
    const target = new EventTarget();
    const seen: string[] = [];

    const unbind = bindMiniToolActions(target, {
      onLocalAction: (action) => {
        seen.push(`${action.component}.${action.actionId}`);
      },
      onDecisionAction: (action) => createDecisionReceiptFromAction(action),
    });

    target.dispatchEvent(
      new CustomEvent("mini-tool:chart-data-point-click", {
        detail: {
          componentId: "chart-1",
          seriesLabel: "Signups",
          xValue: "Jan",
          yValue: 42,
        },
      }),
    );

    target.dispatchEvent(
      new CustomEvent("mini-tool:item-carousel-item-click", {
        detail: {
          componentId: "carousel-1",
          itemId: "item-7",
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    unbind();

    expect(seen).toEqual(["chart.point-click", "item-carousel.item-click"]);
  });

  it("resolves component id from composed event path", async () => {
    const target = new EventTarget();
    const seenComponentIds: string[] = [];

    const unbind = bindMiniToolActions(target, {
      onLocalAction: (action) => {
        seenComponentIds.push(action.componentId);
      },
      onDecisionAction: (action) => createDecisionReceiptFromAction(action),
    });

    const event = new CustomEvent("mini-tool:chart-data-point-click", {
      detail: {
        seriesLabel: "Revenue",
        xValue: "Feb",
        yValue: 73,
      },
    });

    Object.defineProperty(event, "composedPath", {
      configurable: true,
      value: () => [{ dataset: { miniToolId: "chart-from-path" } }],
    });

    target.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 0));
    unbind();

    expect(seenComponentIds).toEqual(["chart-from-path"]);
  });

  it("reports errors when decision handler is missing", async () => {
    const target = new EventTarget();
    const errors: string[] = [];

    const unbind = bindMiniToolActions(
      target,
      {
        onLocalAction: () => undefined,
      },
      {
        onError: (error) => {
          errors.push(String(error));
        },
      },
    );

    target.dispatchEvent(
      new CustomEvent("mini-tool:approval-card-action", {
        detail: {
          actionId: "confirm",
          decision: "approved",
          payload: { id: "approval-1" },
        },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    unbind();

    expect(errors[0]).toContain("without an onDecisionAction handler");
  });

  it("applies component-aware decision commits for message-draft", () => {
    const receipt = createDecisionReceipt(
      {
        component: "message-draft",
        componentId: "draft-1",
        actionId: "send",
        decision: "sent",
      },
      {
        summary: "Sent",
      },
    );

    const next = applyDecisionCommitByComponent(
      "message-draft",
      {
        id: "draft-1",
        channel: "email",
        body: "Hello",
        subject: "Hi",
        to: ["x@example.com"],
      } as Record<string, unknown>,
      receipt,
    );

    expect(next.outcome).toBe("sent");
    expect(next.receipt).toBeUndefined();
  });

  it("applies component-aware decision commits for question-flow", () => {
    const receipt = createDecisionReceipt(
      {
        component: "question-flow",
        componentId: "qf-1",
        actionId: "complete",
        decision: {
          size: ["m"],
        },
      },
      {
        summary: "Complete",
      },
    );

    const next = applyDecisionCommitByComponent(
      "question-flow",
      {
        id: "qf-1",
        steps: [
          {
            id: "size",
            title: "Size",
            options: [
              { id: "s", label: "Small" },
              { id: "m", label: "Medium" },
            ],
          },
        ],
      } as Record<string, unknown>,
      receipt,
      {
        questionFlowTitle: "Project configured",
      },
    );

    expect(next.choice).toEqual({
      title: "Project configured",
      summary: [{ label: "Size", value: "Medium" }],
    });
    expect(next.receipt).toBeDefined();
  });

  it("throws for unmapped component decision commit adapters by default", () => {
    const receipt = createDecisionReceipt(
      {
        component: "unknown-tool",
        componentId: "unknown-1",
        actionId: "confirm",
        decision: true,
      },
      {
        summary: "Confirmed",
      },
    );

    expect(() => {
      applyDecisionCommitByComponent("unknown-tool", { id: "unknown-1" }, receipt);
    }).toThrow("No DecisionCommitAdapter");
  });

  it("applies decision commits to payloads", () => {
    const receipt = createDecisionReceipt(
      {
        component: "approval-card",
        componentId: "approval-1",
        actionId: "confirm",
        decision: "approved",
      },
      {
        summary: "Approved",
      },
    );

    const next = applyDecisionCommit(
      {
        id: "approval-1",
        title: "Deploy release",
      } as Record<string, unknown>,
      receipt,
    );

    expect(next.choice).toBe("approved");
    expect(next.receipt).toBeDefined();
  });
});
