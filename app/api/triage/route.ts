import { getAsset, getAssetHistory } from "@/db/queries";
import { getPastWorkOrders } from "@/db/work-orders";
import { DEFAULT_MODEL, draftTriage, TriageFailedError } from "./_lib/draft-triage";
import { parseTriageForm } from "./_lib/parse-triage-form";

// POST /api/triage: an AI draft of the issue and work order from the operator's
// notes and photos (technical plan v2, section 5). Multipart body: `assetId`,
// `notes`, up to 3 `photos`, and
// matching `question` and `answer` fields when the reviewer has answered the
// AI's clarifying questions (R23). The asset and its history are loaded here, not
// sent by the browser, so the model cannot be fed invented history.
//
// Writes nothing. The reviewer edits the draft and approves it through
// POST /api/work-orders.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "The request could not be read.");
  }

  const parsed = await parseTriageForm(form);
  if (!parsed.ok) {
    return error(400, parsed.message);
  }

  const [asset, history, pastWorkOrders] = await Promise.all([
    getAsset(parsed.assetId),
    getAssetHistory(parsed.assetId),
    getPastWorkOrders(parsed.assetId),
  ]);
  if (!asset) {
    return error(400, `There is no asset ${parsed.assetId}.`);
  }

  try {
    const result = await draftTriage({
      model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL,
      asset,
      history,
      pastWorkOrders,
      notes: parsed.notes,
      photos: parsed.photos,
      clarifications: parsed.clarifications,
    });
    return Response.json(result);
  } catch (cause) {
    if (cause instanceof TriageFailedError) {
      console.error("Triage failed", cause.cause ?? cause);
      return error(
        502,
        "The AI draft could not be made. Try again, or fill in the form by hand.",
      );
    }
    throw cause;
  }
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
