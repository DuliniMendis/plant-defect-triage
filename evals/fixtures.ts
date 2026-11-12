import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Asset, HistoryEntry } from "@/db/schema";
import { seedAssets, seedHistory } from "@/db/seed-data";
import type { PromptPhoto } from "@/app/api/triage/_lib/prompt";
import type { CasePhoto } from "./cases";

// The seeded records an eval case runs against, built from `db/seed-data.ts`
// in the same shape and order the database returns them, so the eval needs no
// database and always sees the clean starting state.

export const PHOTO_DIR = path.join(process.cwd(), "demo-files", "photos");

export function seededAsset(id: string): Asset {
  const a = seedAssets.find((s) => s.id === id);
  if (!a) throw new Error(`No seeded asset ${id}.`);
  return { ...a } as Asset;
}

/** Newest first, matching `getAssetHistory` in `db/queries.ts`. */
export function seededHistory(assetId: string): HistoryEntry[] {
  return seedHistory
    .filter((h) => h.assetId === assetId)
    .map(
      (h): HistoryEntry => ({
        id: h.id,
        assetId: h.assetId,
        date: h.date,
        kind: h.kind,
        title: h.title,
        detail: h.detail ?? "",
        component: h.component ?? null,
        severity: h.severity ?? null,
        meterHours: h.meterHours ?? null,
        status: h.status,
        seeded: true,
        workOrderId: null,
      }),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.meterHours ?? -1) - (a.meterHours ?? -1) ||
        a.id.localeCompare(b.id),
    );
}

/**
 * Reads a sample photo. An `unclear` photo is shrunk, blurred and darkened,
 * like a hurried shot in poor light, so the model cannot make out the defect.
 */
export async function loadPhoto(photo: CasePhoto): Promise<PromptPhoto> {
  const original = await readFile(path.join(PHOTO_DIR, photo.file));
  if (!photo.unclear) return { data: original, mediaType: "image/jpeg" };
  const data = await sharp(original)
    .resize({ width: 320 })
    .blur(12)
    .modulate({ brightness: 0.35 })
    .jpeg({ quality: 50 })
    .toBuffer();
  return { data, mediaType: "image/jpeg" };
}
