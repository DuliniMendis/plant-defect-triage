import type { HistoryEntry } from "@/db/schema";
import type {
  FilledField,
  Priority,
  Severity,
  TriageDraft,
} from "@/lib/schema";
import type { AiFill } from "./ai-fill";

/** An earlier approved work order on the same asset, newest first. */
export type PastWorkOrder = {
  id: string;
  approvedAt: Date;
  final: TriageDraft;
};

/**
 * Priority from severity and whether the asset is safe to operate. A fixed
 * rule, so the same defect always gets the same priority and the model is not
 * asked for it.
 */
export function priorityFor(severity: Severity, safeToOperate: boolean): Priority {
  if (!safeToOperate || severity === "critical") return "immediate";
  if (severity === "high") return "urgent";
  return "routine";
}

/**
 * Turns the model's answer into a full triage draft. Fields that can be worked
 * out without the model are filled here:
 *
 * - Priority and take-out-of-service follow from severity and safe to operate.
 * - Parts and estimated hours come from the latest approved work order on the
 *   same asset and component, when there is one, in place of the model's guess.
 * - Repeat findings keep only history IDs that are real entries for this asset
 *   (R16; AI behaviour rule "must not invent history").
 */
export function fillFromRecords(
  ai: AiFill,
  {
    history,
    pastWorkOrders,
  }: { history: readonly HistoryEntry[]; pastWorkOrders: readonly PastWorkOrder[] },
): { draft: TriageDraft; filled: FilledField[] } {
  const filled: FilledField[] = [];
  const { safeToOperate, severity } = ai.issue;

  const priority = priorityFor(severity, safeToOperate);
  filled.push({
    path: "workOrder.priority",
    source: "rule",
    note: safeToOperate
      ? `Set from ${severity} severity.`
      : "Set to immediate because the asset is not safe to operate.",
  });

  const takeOutOfService = !safeToOperate;
  filled.push({
    path: "workOrder.takeOutOfService",
    source: "rule",
    note: safeToOperate
      ? "Left in service because it is safe to operate."
      : "Taken out of service because it is not safe to operate.",
  });

  let { parts, estimatedHours } = ai.workOrder;
  const past = latestForComponent(pastWorkOrders, ai.issue.component);
  if (past) {
    const source = `From the work order “${past.final.workOrder.title}” approved ${formatDate(past.approvedAt)}.`;
    if (past.final.workOrder.parts.length > 0) {
      parts = past.final.workOrder.parts;
      filled.push({ path: "workOrder.parts", source: "records", note: source });
    }
    if (past.final.workOrder.estimatedHours > 0) {
      estimatedHours = past.final.workOrder.estimatedHours;
      filled.push({ path: "workOrder.estimatedHours", source: "records", note: source });
    }
  }

  const knownIds = new Set(history.map((h) => h.id));
  const relatedHistoryIds = unique(ai.repeat.relatedHistoryIds).filter((id) =>
    knownIds.has(id),
  );

  const draft: TriageDraft = {
    issue: {
      ...ai.issue,
      title: ai.issue.title.trim(),
      component: ai.issue.component.trim(),
    },
    photoObservations: ai.photoObservations.map((o) => o.trim()).filter(Boolean),
    repeat: {
      // A repeat with no real history to point at is not reported as one.
      isRepeat: ai.repeat.isRepeat && relatedHistoryIds.length > 0,
      relatedHistoryIds,
      summary: relatedHistoryIds.length > 0 ? ai.repeat.summary.trim() : "",
    },
    workOrder: {
      title: ai.workOrder.title.trim(),
      priority,
      tasks: ai.workOrder.tasks.map((t) => t.trim()).filter(Boolean),
      parts: parts.map((p) => p.trim()).filter(Boolean),
      estimatedHours: Math.max(0, estimatedHours),
      takeOutOfService,
    },
    confidence: ai.confidence,
    clarifyingQuestion: ai.clarifyingQuestion?.trim() || null,
  };

  return { draft, filled };
}

function latestForComponent(
  pastWorkOrders: readonly PastWorkOrder[],
  component: string,
): PastWorkOrder | undefined {
  const key = normalise(component);
  if (!key) return undefined;
  return pastWorkOrders
    .filter((w) => normalise(w.final.issue.component) === key)
    .sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime())[0];
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
