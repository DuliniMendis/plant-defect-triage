import { ACCEPTED_TYPES, MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/photo-rules";
import type { PromptPhoto } from "./prompt";

export type ParsedTriageForm =
  | { ok: true; assetId: string; notes: string; photos: PromptPhoto[] }
  | { ok: false; message: string };

/**
 * Reads the multipart body of POST /api/triage: `assetId`, `notes`, and up to
 * 3 `photos` files. Notes are required (R10 as changed on 11 Nov 2026).
 */
export async function parseTriageForm(form: FormData): Promise<ParsedTriageForm> {
  const assetId = form.get("assetId");
  const notes = form.get("notes");
  if (typeof assetId !== "string" || !assetId.trim()) {
    return { ok: false, message: "The request did not say which asset this is for." };
  }
  if (typeof notes !== "string" || !notes.trim()) {
    return { ok: false, message: "Type some notes about the defect before drafting." };
  }

  const files = form.getAll("photos");
  if (files.length > MAX_PHOTOS) {
    return { ok: false, message: `You can send up to ${MAX_PHOTOS} photos.` };
  }
  const photos: PromptPhoto[] = [];
  for (const file of files) {
    if (typeof file === "string") {
      return { ok: false, message: "A photo could not be read." };
    }
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, message: "Photos must be JPEG, PNG or WebP images." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, message: "A photo is too large. Try a smaller one." };
    }
    photos.push({ data: new Uint8Array(await file.arrayBuffer()), mediaType: file.type });
  }

  return { ok: true, assetId: assetId.trim(), notes: notes.trim(), photos };
}
