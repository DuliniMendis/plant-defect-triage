import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { historyEntries, workOrderPhotos, workOrders, type HistoryEntry } from "./schema";

/** What deleting a history entry removed. */
export type DeletedEntry = {
  /** The work order the entry was created by, if it had one. */
  workOrderId: string | null;
  /** Stored paths of that work order's photos, to remove from the photo store. */
  photoPaths: string[];
};

/**
 * Deletes one history entry of the given kinds from an asset, and the work
 * order it belongs to, if any, in one transaction. Deleting the work order also
 * removes its photo rows (on delete cascade). The photo files are not touched:
 * the caller removes them from the photo store once this has succeeded.
 *
 * Returns null when the asset has no such entry of those kinds.
 */
export async function deleteHistoryEntry(
  assetId: string,
  entryId: string,
  kinds: readonly HistoryEntry["kind"][],
): Promise<DeletedEntry | null> {
  return getDb().transaction(async (tx) => {
    const [entry] = await tx
      .select({ id: historyEntries.id, workOrderId: historyEntries.workOrderId })
      .from(historyEntries)
      .where(
        and(
          eq(historyEntries.id, entryId),
          eq(historyEntries.assetId, assetId),
          inArray(historyEntries.kind, [...kinds]),
        ),
      )
      .limit(1);
    if (!entry) return null;

    let photoPaths: string[] = [];
    if (entry.workOrderId) {
      const photos = await tx
        .select({ blobPath: workOrderPhotos.blobPath })
        .from(workOrderPhotos)
        .where(eq(workOrderPhotos.workOrderId, entry.workOrderId));
      photoPaths = photos.map((p) => p.blobPath);
      await tx.delete(workOrders).where(eq(workOrders.id, entry.workOrderId));
    }
    // Already gone when the work order's delete cascaded to it.
    await tx.delete(historyEntries).where(eq(historyEntries.id, entry.id));

    return { workOrderId: entry.workOrderId, photoPaths };
  });
}
