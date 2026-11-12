import { describe, expect, test } from "vitest";
import { blankDraft, type Severity, type TriageDraft } from "@/lib/schema";
import { percentile, severityDirection, summarise, type InsightRun } from "./summarise";

function draft(severity: Severity = "medium"): TriageDraft {
  const d = blankDraft();
  d.issue.severity = severity;
  return d;
}

function run(overrides: Partial<InsightRun> = {}): InsightRun {
  return {
    model: "anthropic/claude-sonnet-5.5",
    status: "succeeded",
    durationMs: 8000,
    inputTokens: 5000,
    outputTokens: 800,
    costUsd: 0.02,
    workOrder: null,
    ...overrides,
  };
}

function approvedAs(changedFields: string[], before: Severity = "medium", after = before) {
  return { aiDraft: draft(before), final: draft(after), changedFields };
}

describe("percentile", () => {
  test("interpolates between ranks like percentile_cont", () => {
    const values = [1000, 2000, 3000, 4000, 5000];
    expect(percentile(values, 0.5)).toBe(3000);
    // rank 0.95 * 4 = 3.8: 4000 + 0.8 * 1000
    expect(percentile(values, 0.95)).toBeCloseTo(4800);
  });

  test("a single value is every percentile; no values is null", () => {
    expect(percentile([7000], 0.95)).toBe(7000);
    expect(percentile([], 0.5)).toBeNull();
  });
});

test("counts requests and failures, and times only succeeded runs", () => {
  const insights = summarise([
    run({ durationMs: 6000 }),
    run({ durationMs: 10000 }),
    run({ status: "failed", durationMs: 60000, inputTokens: null, outputTokens: null, costUsd: null }),
  ]);
  expect(insights.requests).toEqual({ total: 3, failed: 1 });
  expect(insights.time).toMatchObject({ count: 2, p50Ms: 8000, indicative: true });
  expect(insights.time.p95Ms).toBeCloseTo(9800);
});

test("averages cost and tokens per draft, totals every known cost, and counts missing costs", () => {
  const insights = summarise([
    run({ costUsd: 0.01, inputTokens: 4000, outputTokens: 600 }),
    run({ costUsd: 0.03, inputTokens: 6000, outputTokens: 1000 }),
    run({ costUsd: null }),
    run({ status: "failed", costUsd: 0.005, inputTokens: 3000, outputTokens: 0 }),
  ]);
  expect(insights.cost.averageUsd).toBeCloseTo(0.02);
  expect(insights.cost.totalUsd).toBeCloseTo(0.045);
  expect(insights.cost.averageInputTokens).toBe(5000);
  expect(insights.cost.totalInputTokens).toBe(18000);
  expect(insights.cost.draftsCosted).toBe(2);
  expect(insights.cost.missing).toBe(1);
});

test("approval share is approved drafts over succeeded drafts", () => {
  const insights = summarise([
    run({ workOrder: approvedAs([]) }),
    run(),
    run(),
    run({ workOrder: approvedAs(["issue.title"]) }),
    run({ status: "failed" }),
  ]);
  expect(insights.approval).toEqual({ drafts: 4, approved: 2, share: 0.5 });
});

test("edit measures count only review form fields, most changed first", () => {
  const insights = summarise([
    run({ workOrder: approvedAs([]) }),
    run({ workOrder: approvedAs(["issue.severity", "workOrder.tasks"], "medium", "high") }),
    // photoObservations is not on the review form, so it is not an edit.
    run({ workOrder: approvedAs(["workOrder.tasks", "photoObservations"]) }),
    run({ workOrder: approvedAs(["issue.severity"], "high", "low") }),
  ]);
  const { edits } = insights;
  expect(edits.approved).toBe(4);
  expect(edits.unchanged).toBe(1);
  expect(edits.unchangedShare).toBe(0.25);
  expect(edits.averageChanged).toBe(1);
  expect(edits.fieldCount).toBe(12);
  expect(edits.byField.slice(0, 2)).toEqual([
    { path: "issue.severity", label: "Severity", count: 2 },
    { path: "workOrder.tasks", label: "Tasks", count: 2 },
  ]);
  expect(edits.byField).toHaveLength(12);
  expect(edits.severity).toEqual({ changed: 2, raised: 1, lowered: 1 });
});

test("narrowing to a model changes every figure and still lists all models", () => {
  const runs = [
    run({ model: "anthropic/claude-sonnet-5.5", costUsd: 0.02 }),
    run({ model: "anthropic/claude-haiku-5.5", costUsd: 0.001, durationMs: 3000 }),
  ];
  const haiku = summarise(runs, "anthropic/claude-haiku-5.5");
  expect(haiku.models).toEqual(["anthropic/claude-haiku-5.5", "anthropic/claude-sonnet-5.5"]);
  expect(haiku.model).toBe("anthropic/claude-haiku-5.5");
  expect(haiku.requests.total).toBe(1);
  expect(haiku.cost.averageUsd).toBe(0.001);
  expect(haiku.time.p95Ms).toBe(3000);
});

test("with no runs, figures are empty rather than zero", () => {
  const insights = summarise([]);
  expect(insights.cost.averageUsd).toBeNull();
  expect(insights.cost.totalUsd).toBeNull();
  expect(insights.time.p95Ms).toBeNull();
  expect(insights.approval.share).toBeNull();
  expect(insights.edits.averageChanged).toBeNull();
});

test("severity direction follows low < medium < high < critical", () => {
  expect(severityDirection("low", "critical")).toBe(1);
  expect(severityDirection("high", "medium")).toBe(-1);
  expect(severityDirection("high", "high")).toBe(0);
});
