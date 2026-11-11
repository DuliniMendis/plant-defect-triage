import { generateText, Output, type LanguageModel } from "ai";
import type { Asset, HistoryEntry } from "@/db/schema";
import {
  triageDraftSchema,
  type Clarification,
  type TriageResponse,
} from "@/lib/schema";
import { aiFillSchema } from "./ai-fill";
import { fillFromRecords, type PastWorkOrder } from "./fill-from-records";
import {
  systemMessage,
  triageMessages,
  type PromptPhoto,
} from "./prompt";

export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

/** The model call failed or returned something unusable. Shown as a 502. */
export class TriageFailedError extends Error {}

/**
 * Asks the model for the judgement fields, then fills the rest from the
 * asset's records and fixed rules (`fill-from-records.ts`). Writes nothing.
 */
export async function draftTriage({
  model,
  asset,
  history,
  pastWorkOrders,
  notes,
  photos,
  clarifications = [],
  now = () => performance.now(),
}: {
  /** A Gateway model ID such as "anthropic/claude-sonnet-5.5", or a model instance in tests. */
  model: LanguageModel;
  asset: Asset;
  history: readonly HistoryEntry[];
  pastWorkOrders: readonly PastWorkOrder[];
  notes: string;
  photos: readonly PromptPhoto[];
  /** The reviewer's answers to the AI's earlier questions (R23). */
  clarifications?: readonly Clarification[];
  now?: () => number;
}): Promise<TriageResponse> {
  const started = now();

  let result;
  try {
    result = await generateText({
      model,
      instructions: systemMessage,
      messages: triageMessages({ asset, history, notes, photos, clarifications }),
      output: Output.object({ schema: aiFillSchema }),
      // Low reasoning keeps a draft near the 10-second target (requirements
      // section 7). Step 8 of the plan compares quality at this setting.
      reasoning: "low",
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    throw new TriageFailedError("The model call failed.", { cause });
  }

  const { draft, filled } = fillFromRecords(result.output, { history, pastWorkOrders });
  const checked = triageDraftSchema.safeParse(draft);
  if (!checked.success) {
    throw new TriageFailedError("The model's draft was incomplete.", {
      cause: checked.error,
    });
  }

  const usage = result.usage.inputTokenDetails;
  // Logged so cache hits can be checked in the server logs.
  console.info("triage", {
    model: modelId(model),
    inputTokens: result.usage.inputTokens,
    cacheReadTokens: usage?.cacheReadTokens,
    cacheWriteTokens: usage?.cacheWriteTokens,
    outputTokens: result.usage.outputTokens,
  });

  return {
    draft: checked.data,
    model: result.response.modelId || modelId(model),
    durationMs: Math.round(now() - started),
    filled,
  };
}

function modelId(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}
