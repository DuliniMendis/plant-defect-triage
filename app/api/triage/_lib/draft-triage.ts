import type { GatewayProviderOptions } from "@ai-sdk/gateway";
import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import type { Asset, HistoryEntry, RunStatus } from "@/db/schema";
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

// Haiku 5.5 matched or beat Sonnet 5.5 on every eval case at a fraction of the
// cost (docs/evals.md). AI_GATEWAY_MODEL overrides it.
export const DEFAULT_MODEL = "anthropic/claude-haiku-5.5";

/** Tags the Gateway requests so they can be filtered in AI Gateway Logs. */
export const TRIAGE_TAG = "triage-draft";

/**
 * What one draft request cost and how long it took, recorded as an AI run
 * (R39, technical plan v3, section 2). Holds no notes, photos or draft content.
 */
export type RunMeasurement = {
  /** The model that was asked, so every run of one model groups together. */
  model: string;
  status: RunStatus;
  /** A short code when the run failed, never the error text. */
  errorKind: "model-call" | "invalid-output" | "incomplete-draft" | null;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  /** AI Gateway's ID for the request, used to look up its cost. */
  generationId: string | null;
};

/** The model call failed or returned something unusable. Shown as a 502. */
export class TriageFailedError extends Error {
  constructor(
    message: string,
    readonly measurement: RunMeasurement,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

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
}): Promise<{ triage: Omit<TriageResponse, "runId">; measurement: RunMeasurement }> {
  const started = now();
  const failed = (
    errorKind: NonNullable<RunMeasurement["errorKind"]>,
    usage: { inputTokens?: number; outputTokens?: number } = {},
    generationId: string | null = null,
  ): RunMeasurement => ({
    model: modelId(model),
    status: "failed",
    errorKind,
    durationMs: Math.round(now() - started),
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    generationId,
  });

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
      telemetry: { functionId: TRIAGE_TAG },
      providerOptions: {
        gateway: { tags: [TRIAGE_TAG] } satisfies GatewayProviderOptions,
      },
    });
  } catch (cause) {
    // A response that is not the requested shape was still paid for, so its
    // tokens are kept.
    const measurement = NoObjectGeneratedError.isInstance(cause)
      ? failed("invalid-output", cause.usage)
      : failed("model-call");
    throw new TriageFailedError("The model call failed.", measurement, { cause });
  }

  const generationId = gatewayGenerationId(result);

  const { draft, filled } = fillFromRecords(result.output, { history, pastWorkOrders });
  const checked = triageDraftSchema.safeParse(draft);
  if (!checked.success) {
    throw new TriageFailedError(
      "The model's draft was incomplete.",
      failed("incomplete-draft", result.usage, generationId),
      { cause: checked.error },
    );
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

  const durationMs = Math.round(now() - started);
  return {
    triage: {
      draft: checked.data,
      model: result.response.modelId || modelId(model),
      durationMs,
      filled,
    },
    measurement: {
      model: modelId(model),
      status: "succeeded",
      errorKind: null,
      durationMs,
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      generationId,
    },
  };
}

/** AI Gateway's generation ID, from a result's or response's provider metadata. */
function gatewayGenerationId(
  source: { providerMetadata?: Record<string, Record<string, unknown> | undefined> } | undefined,
): string | null {
  const id = source?.providerMetadata?.gateway?.generationId;
  return typeof id === "string" ? id : null;
}

function modelId(model: LanguageModel): string {
  return typeof model === "string" ? model : model.modelId;
}
