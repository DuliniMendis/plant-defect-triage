import "server-only";
import { desc, eq } from "drizzle-orm";
import type { InsightRun } from "@/app/insights/_lib/summarise";
import { getDb } from "./client";
import { aiRuns, workOrders } from "./schema";

/**
 * Every AI run with the work order its draft became, if any, newest first
 * (R41 to R43). The figures are worked out from these in
 * `app/insights/_lib/summarise.ts`.
 */
export async function getInsightRuns(): Promise<InsightRun[]> {
  const rows = await getDb()
    .select({
      model: aiRuns.model,
      status: aiRuns.status,
      durationMs: aiRuns.durationMs,
      inputTokens: aiRuns.inputTokens,
      outputTokens: aiRuns.outputTokens,
      costUsd: aiRuns.costUsd,
      workOrderId: workOrders.id,
      aiDraft: workOrders.aiDraft,
      final: workOrders.final,
      changedFields: workOrders.changedFields,
    })
    .from(aiRuns)
    .leftJoin(workOrders, eq(workOrders.aiRunId, aiRuns.id))
    .orderBy(desc(aiRuns.createdAt));

  return rows.map(({ workOrderId, aiDraft, final, changedFields, ...run }) => ({
    ...run,
    workOrder:
      workOrderId && final
        ? { aiDraft, final, changedFields: changedFields ?? [] }
        : null,
  }));
}
