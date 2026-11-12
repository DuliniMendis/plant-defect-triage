import { getAsset } from "@/db/queries";
import { insertWorkOrder, InvalidAiRunError, UnknownAssetError } from "@/db/work-orders";
import { getPhotoStore } from "@/lib/photo-store";
import { parseWorkOrderForm, saveWorkOrder } from "./_lib/save-work-order";

// POST /api/work-orders: saves an approved work order (technical plan v2,
// section 5). The body is multipart: a `payload` field with
// `{ assetId, notes, aiDraft, final, model, aiRunId }` as JSON, and up to 3 `photos`.
// Photos are uploaded first; then the work order, its history entry, photo
// rows and any status change are written in one transaction. If that fails,
// the uploaded photos are deleted (R27).
//
// Discard never calls this route, so it creates no work order. The AI run
// recorded by POST /api/triage stays, with no work order linked (R21, R40).
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "The request could not be read.");
  }

  const parsed = parseWorkOrderForm(form);
  if (!parsed.ok) {
    return error(400, parsed.message);
  }

  // Checked before uploading, so photos are never sent for an unknown asset.
  // The transaction checks again in case the asset is removed meanwhile.
  if (!(await getAsset(parsed.request.assetId))) {
    return error(400, `There is no asset ${parsed.request.assetId}.`);
  }

  try {
    const { workOrderId } = await saveWorkOrder(parsed.request, parsed.photos, {
      store: getPhotoStore(),
      persist: insertWorkOrder,
    });
    return Response.json({ workOrderId }, { status: 201 });
  } catch (cause) {
    if (cause instanceof UnknownAssetError) {
      return error(400, `There is no asset ${parsed.request.assetId}.`);
    }
    if (cause instanceof InvalidAiRunError) {
      return error(400, "The AI draft this work order came from could not be found. Draft it again.");
    }
    console.error("Saving a work order failed", cause);
    return error(
      500,
      "The work order could not be saved, so nothing was kept. Try again.",
    );
  }
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
