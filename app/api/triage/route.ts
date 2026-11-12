import { gateway } from "@ai-sdk/gateway";
import { after } from "next/server";
import { insertAiRun, setAiRunCost, type RunMeasurement } from "@/db/ai-runs";
import { getAsset, getAssetHistory } from "@/db/queries";
import { getPastWorkOrders } from "@/db/work-orders";
import { DEFAULT_MODEL, draftTriage, TriageFailedError } from "./_lib/draft-triage";
import { parseTriageForm } from "./_lib/parse-triage-form";
import { lookUpCost } from "./_lib/run-cost";

// POST /api/triage: an AI draft of the issue and work order from the operator's
// notes and photos (technical plan v2, section 5). Multipart body: `assetId`,
// `notes`, up to 3 `photos`, and
// matching `question` and `answer` fields when the reviewer has answered the
// AI's clarifying questions (R23). The asset and its history are loaded here, not
// sent by the browser, so the model cannot be fed invented history.
//
// Writes one AI run per request, succeeded or failed: model, tokens, time and,
// once AI Gateway reports it, cost (R39, technical plan v3). Never the notes,
// photos or draft. The reviewer edits the draft and approves it through
// POST /api/work-orders, which links the work order to the run.
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
    const runId = await recordRun(asset.id, result.measurement);
    return Response.json({ ...result.triage, runId });
  } catch (cause) {
    if (cause instanceof TriageFailedError) {
      console.error("Triage failed", cause.cause ?? cause);
      await recordRun(asset.id, cause.measurement);
      return error(
        502,
        "The AI draft could not be made. Try again, or fill in the form by hand.",
      );
    }
    throw cause;
  }
}

/**
 * Records the run, and schedules the cost lookup for after the response. A
 * failure to record is logged and never fails the draft.
 */
async function recordRun(
  assetId: string,
  measurement: RunMeasurement,
): Promise<string | null> {
  let runId: string;
  try {
    runId = await insertAiRun(assetId, measurement);
  } catch (cause) {
    console.error("Could not record the AI run", cause);
    return null;
  }

  const { generationId } = measurement;
  if (generationId) {
    after(async () => {
      const cost = await lookUpCost(generationId, {
        lookup: (id) => gateway.getGenerationInfo({ id }),
      });
      if (cost === null) {
        console.warn("AI Gateway did not report a cost", { runId, generationId });
        return;
      }
      await setAiRunCost(runId, cost).catch((cause: unknown) =>
        console.error("Could not save the AI run's cost", cause),
      );
    });
  }
  return runId;
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
