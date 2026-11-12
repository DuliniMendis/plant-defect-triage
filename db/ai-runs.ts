import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { aiRuns } from "./schema";

export type RunMeasurement = Pick<
  typeof aiRuns.$inferInsert,
  | "model"
  | "status"
  | "errorKind"
  | "durationMs"
  | "inputTokens"
  | "outputTokens"
  | "generationId"
>;

// AI runs: one row per AI draft request, succeeded or failed (R39, technical
// plan v3, section 2). Measurements only, never notes, photos or draft content.

/** Records a draft request and returns the run's ID. */
export async function insertAiRun(
  assetId: string,
  measurement: RunMeasurement,
): Promise<string> {
  const [row] = await getDb()
    .insert(aiRuns)
    .values({ assetId, ...measurement })
    .returning({ id: aiRuns.id });
  return row.id;
}

/** Sets a run's cost once AI Gateway reports it. */
export async function setAiRunCost(runId: string, costUsd: number): Promise<void> {
  await getDb().update(aiRuns).set({ costUsd }).where(eq(aiRuns.id, runId));
}
