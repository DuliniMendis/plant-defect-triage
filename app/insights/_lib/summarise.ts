import { severities, type Severity, type TriageDraft } from "@/lib/schema";

// The Insights page figures (R41 to R43, technical plan v3, section 4), worked
// out from the AI runs and the work orders linked to them. Pure, so it can be
// unit tested without a database.

/** One AI run, with the work order its draft became, if any. */
export type InsightRun = {
  model: string;
  status: "succeeded" | "failed";
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  /** US dollars; null when AI Gateway has not reported it yet. */
  costUsd: number | null;
  workOrder: {
    aiDraft: TriageDraft | null;
    final: TriageDraft;
    changedFields: string[];
  } | null;
};

/** The 12 fields on the review form, in form order. Only these count as edits. */
export const REVIEW_FIELDS = [
  { path: "issue.title", label: "Issue title" },
  { path: "issue.description", label: "Description" },
  { path: "issue.component", label: "Component" },
  { path: "issue.severity", label: "Severity" },
  { path: "issue.severityReason", label: "Severity reason" },
  { path: "issue.safeToOperate", label: "Safe to operate" },
  { path: "workOrder.title", label: "Work order title" },
  { path: "workOrder.priority", label: "Priority" },
  { path: "workOrder.tasks", label: "Tasks" },
  { path: "workOrder.parts", label: "Parts" },
  { path: "workOrder.estimatedHours", label: "Estimated hours" },
  { path: "workOrder.takeOutOfService", label: "Take out of service" },
] as const;

const reviewPaths = new Set<string>(REVIEW_FIELDS.map((f) => f.path));

/** Below this many runs, a percentile is shown as indicative only. */
export const INDICATIVE_BELOW = 20;

export type Insights = ReturnType<typeof summarise>;

/** Every figure on the page, for all runs or for one model's runs. */
export function summarise(allRuns: readonly InsightRun[], model?: string) {
  const models = [...new Set(allRuns.map((r) => r.model))].sort();
  const runs = model ? allRuns.filter((r) => r.model === model) : allRuns;
  const succeeded = runs.filter((r) => r.status === "succeeded");

  const costed = runs.filter((r) => r.costUsd !== null);
  const succeededCosted = succeeded.filter((r) => r.costUsd !== null);
  const durations = succeeded.map((r) => r.durationMs).sort((a, b) => a - b);
  const approved = succeeded.flatMap((r) => (r.workOrder ? [r.workOrder] : []));

  return {
    models,
    model: model ?? null,
    requests: {
      total: runs.length,
      failed: runs.length - succeeded.length,
    },
    cost: {
      /** Per succeeded draft, over the drafts whose cost is known. */
      averageUsd: average(succeededCosted.map((r) => r.costUsd ?? 0)),
      /** Every run with a known cost, failed ones included: what was spent. */
      totalUsd: costed.length ? sum(costed.map((r) => r.costUsd ?? 0)) : null,
      averageInputTokens: average(succeeded.map((r) => r.inputTokens ?? 0)),
      averageOutputTokens: average(succeeded.map((r) => r.outputTokens ?? 0)),
      totalInputTokens: sum(runs.map((r) => r.inputTokens ?? 0)),
      totalOutputTokens: sum(runs.map((r) => r.outputTokens ?? 0)),
      draftsCosted: succeededCosted.length,
      /** Runs whose cost AI Gateway has not reported yet. */
      missing: runs.length - costed.length,
    },
    time: {
      count: durations.length,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      indicative: durations.length < INDICATIVE_BELOW,
    },
    approval: {
      drafts: succeeded.length,
      approved: approved.length,
      share: ratio(approved.length, succeeded.length),
    },
    edits: editMeasures(approved),
  };
}

function editMeasures(approved: readonly NonNullable<InsightRun["workOrder"]>[]) {
  const counts = new Map<string, number>(REVIEW_FIELDS.map((f) => [f.path, 0]));
  let unchanged = 0;
  let changedTotal = 0;
  let severityRaised = 0;
  let severityLowered = 0;

  for (const order of approved) {
    const changed = order.changedFields.filter((path) => reviewPaths.has(path));
    if (changed.length === 0) unchanged += 1;
    changedTotal += changed.length;
    for (const path of changed) counts.set(path, (counts.get(path) ?? 0) + 1);

    if (order.aiDraft) {
      const direction = severityDirection(order.aiDraft.issue.severity, order.final.issue.severity);
      if (direction > 0) severityRaised += 1;
      if (direction < 0) severityLowered += 1;
    }
  }

  return {
    approved: approved.length,
    unchanged,
    unchangedShare: ratio(unchanged, approved.length),
    averageChanged: approved.length ? changedTotal / approved.length : null,
    fieldCount: REVIEW_FIELDS.length,
    /** Every review field with how often it was changed, most often first; ties keep form order. */
    byField: REVIEW_FIELDS.map((f) => ({ ...f, count: counts.get(f.path) ?? 0 })).sort(
      (a, b) => b.count - a.count,
    ),
    severity: {
      changed: severityRaised + severityLowered,
      raised: severityRaised,
      lowered: severityLowered,
    },
  };
}

/** Positive when the reviewer raised the severity, negative when they lowered it. */
export function severityDirection(before: Severity, after: Severity): number {
  return Math.sign(severities.indexOf(after) - severities.indexOf(before));
}

/**
 * The p-th percentile of sorted values by linear interpolation between the
 * closest ranks, the same method as Postgres `percentile_cont`. Null for no values.
 */
export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = p * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

function average(values: readonly number[]): number | null {
  return values.length ? sum(values) / values.length : null;
}

function ratio(part: number, whole: number): number | null {
  return whole ? part / whole : null;
}
