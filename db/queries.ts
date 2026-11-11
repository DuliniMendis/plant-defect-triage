import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./client";
import { assets, historyEntries, type Asset, type HistoryEntry } from "./schema";

// Reads used by pages and routes (technical plan v2, section 8).

/** One asset by ID, or undefined when there is no such asset. */
export async function getAsset(id: string): Promise<Asset | undefined> {
  const [asset] = await getDb()
    .select()
    .from(assets)
    .where(eq(assets.id, id))
    .limit(1);
  return asset;
}

/**
 * An asset's history, newest first (R6). Entries on the same day are ordered by
 * meter reading, highest first, then by ID so the order is stable.
 */
export async function getAssetHistory(assetId: string): Promise<HistoryEntry[]> {
  return getDb()
    .select()
    .from(historyEntries)
    .where(eq(historyEntries.assetId, assetId))
    .orderBy(
      sql`${historyEntries.date} desc`,
      sql`${historyEntries.meterHours} desc nulls last`,
      historyEntries.id,
    );
}
