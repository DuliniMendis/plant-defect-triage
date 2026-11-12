import type { TriageDraft, WorkOrderRequestInput } from "@/lib/schema";

// Sends an approved work order to POST /api/work-orders, with its photos as
// files in the same multipart request (technical plan v2, section 5).

export type SubmitResult =
  | { ok: true; workOrderId: string }
  | { ok: false; message: string };

const fallbackMessage =
  "The work order could not be saved, so nothing was kept. Check your connection and try again.";

export async function submitWorkOrder({
  assetId,
  notes,
  aiDraft = null,
  model = null,
  aiRunId = null,
  final,
  photos,
}: {
  assetId: string;
  notes: string;
  aiDraft?: TriageDraft | null;
  model?: string | null;
  /** The AI run that produced `aiDraft` (R40). */
  aiRunId?: string | null;
  final: TriageDraft;
  photos: readonly Blob[];
}): Promise<SubmitResult> {
  const payload: WorkOrderRequestInput = { assetId, notes, aiDraft, final, model, aiRunId };
  const body = new FormData();
  body.set("payload", JSON.stringify(payload));
  photos.forEach((photo, index) => {
    body.append("photos", photo, `photo-${index + 1}.jpg`);
  });

  let response: Response;
  try {
    response = await fetch("/api/work-orders", { method: "POST", body });
  } catch {
    return { ok: false, message: fallbackMessage };
  }

  const json: unknown = await response.json().catch(() => null);
  if (response.ok && isObject(json) && typeof json.workOrderId === "string") {
    return { ok: true, workOrderId: json.workOrderId };
  }
  const message =
    isObject(json) && typeof json.error === "string" ? json.error : fallbackMessage;
  return { ok: false, message };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
