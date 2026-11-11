import type { TriageDraft } from "./schema";

/**
 * The fields of `final` that differ from `aiDraft`, as dotted paths such as
 * "issue.severity" or "workOrder.tasks" (R22). Lists count as one field, so
 * editing one task reports "workOrder.tasks". A manual work order has no AI
 * draft, so nothing is reported as changed.
 *
 * Computed on the server when a work order is saved (technical plan v2,
 * section 5).
 */
export function changedFields(
  aiDraft: TriageDraft | null,
  final: TriageDraft,
): string[] {
  if (!aiDraft) return [];
  const changed: string[] = [];
  collect(aiDraft, final, "", changed);
  return changed;
}

function collect(before: unknown, after: unknown, path: string, out: string[]) {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      collect(before[key], after[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }
  if (!sameValue(before, after)) out.push(path);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  return Object.is(a, b);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
