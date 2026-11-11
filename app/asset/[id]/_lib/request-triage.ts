import { triageResponseSchema, type TriageResponse } from "@/lib/schema";

// Asks POST /api/triage for an AI draft of the issue and work order, sending
// the notes and photos as multipart form data (technical plan v2, section 5).

export type TriageResult =
  | { ok: true; triage: TriageResponse }
  | { ok: false; message: string };

const fallbackMessage =
  "The AI draft could not be made. Try again, or fill in the form by hand.";

export async function requestTriage({
  assetId,
  notes,
  photos,
}: {
  assetId: string;
  notes: string;
  photos: readonly Blob[];
}): Promise<TriageResult> {
  const body = new FormData();
  body.set("assetId", assetId);
  body.set("notes", notes);
  photos.forEach((photo, index) => {
    body.append("photos", photo, `photo-${index + 1}.jpg`);
  });

  let response: Response;
  try {
    response = await fetch("/api/triage", { method: "POST", body });
  } catch {
    return { ok: false, message: fallbackMessage };
  }

  const json: unknown = await response.json().catch(() => null);
  if (response.ok) {
    const parsed = triageResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, triage: parsed.data }
      : { ok: false, message: fallbackMessage };
  }
  const message =
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof json.error === "string"
      ? json.error
      : fallbackMessage;
  return { ok: false, message };
}
