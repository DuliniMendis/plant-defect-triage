import type { HistoryEntry } from "@/db/schema";

/**
 * History entries a user can delete from the asset profile: issues, including
 * the work order entries an approved issue creates. Repairs and schedule
 * checks are records of work done and stay.
 */
export const deletableKinds = ["issue", "work-order"] as const satisfies readonly HistoryEntry["kind"][];

export function isDeletable(kind: HistoryEntry["kind"]): boolean {
  return (deletableKinds as readonly string[]).includes(kind);
}
