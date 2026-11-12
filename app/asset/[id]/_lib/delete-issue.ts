"use server";

import { refresh } from "next/cache";
import { deleteHistoryEntry } from "@/db/history";
import { getPhotoStore } from "@/lib/photo-store";
import { deletableKinds } from "./issue-kinds";

export type DeleteIssueResult = { ok: true } | { ok: false; message: string };

/**
 * Deletes an issue from an asset's history, with the work order it created and
 * that work order's photos, if any. Called from the confirmation dialog on the
 * history timeline. Server Actions are public endpoints, so the arguments are
 * checked here rather than trusted.
 */
export async function deleteIssue(
  assetId: unknown,
  entryId: unknown,
): Promise<DeleteIssueResult> {
  if (typeof assetId !== "string" || typeof entryId !== "string") {
    return { ok: false, message: "The issue to delete could not be read." };
  }

  let deleted;
  try {
    deleted = await deleteHistoryEntry(assetId, entryId, deletableKinds);
  } catch (cause) {
    console.error("Deleting an issue failed", cause);
    return {
      ok: false,
      message: "The issue could not be deleted, so nothing was removed. Try again.",
    };
  }

  // Show the current history either way.
  refresh();

  if (!deleted) {
    return {
      ok: false,
      message: "This issue is no longer in the history. It may already have been deleted.",
    };
  }

  // The rows are gone, so the delete has succeeded. A photo file left behind
  // is only unused storage, so log it rather than report a failure.
  try {
    await getPhotoStore().delete(deleted.photoPaths);
  } catch (cause) {
    console.error("Removing the photos of a deleted work order failed", cause);
  }

  return { ok: true };
}
