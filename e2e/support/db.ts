import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";
import { getPhotoStore } from "../../lib/photo-store";

// Direct database access for end-to-end tests: checking what was saved, and
// removing work orders a test created so the shared demo data is left as the
// seed made it.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

let pool: Pool | undefined;
function db() {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function assetStatus(assetId: string): Promise<string> {
  const { rows } = await db().query("select status from assets where id = $1", [assetId]);
  return rows[0].status;
}

export async function workOrderCount(assetId: string): Promise<number> {
  const { rows } = await db().query(
    "select count(*)::int as n from work_orders where asset_id = $1",
    [assetId],
  );
  return rows[0].n;
}

export async function workOrderIds(): Promise<Set<string>> {
  const { rows } = await db().query("select id from work_orders");
  return new Set(rows.map((r) => r.id as string));
}

/** The asset's most recently approved work order, as stored. */
export async function latestWorkOrder(assetId: string) {
  const { rows } = await db().query(
    `select ai_draft, final, changed_fields, model from work_orders
      where asset_id = $1 order by approved_at desc limit 1`,
    [assetId],
  );
  return rows[0] as
    | { ai_draft: unknown; final: unknown; changed_fields: string[]; model: string | null }
    | undefined;
}

/** Removes the asset's non-seed work orders and their photos, and sets its status back. */
export async function removeWorkOrders(assetId: string, status: string) {
  const { rows } = await db().query(
    `select p.blob_path from work_order_photos p
       join work_orders w on w.id = p.work_order_id
      where w.asset_id = $1`,
    [assetId],
  );
  await db().query("delete from work_orders where asset_id = $1", [assetId]);
  await db().query("update assets set status = $2 where id = $1", [assetId, status]);
  await getPhotoStore().delete(rows.map((r) => r.blob_path as string));
}

/** True when photos are kept in the local stand-in rather than Vercel Blob. */
export const usesLocalPhotos = !process.env.BLOB_READ_WRITE_TOKEN;

/** Work order IDs that have photo files in the local stand-in store. */
export async function localPhotoFolders(): Promise<string[]> {
  const root = path.join(process.cwd(), ".data", "photos", "work-orders");
  const folders = await readdir(root, { withFileTypes: true }).catch(() => []);
  const withFiles: string[] = [];
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const files = await readdir(path.join(root, folder.name));
    if (files.length > 0) withFiles.push(folder.name);
  }
  return withFiles;
}

/** One AI run for the Insights spec, optionally approved as a work order. */
export type InsightFixture = {
  status: "succeeded" | "failed";
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  workOrder?: { aiDraft: unknown; final: unknown; changedFields: string[] };
};

/**
 * Adds AI runs, and the work orders approved from them, under a model name
 * used only by this test, so the Insights page can be narrowed to exactly
 * these. They go on a temporary asset, so the clean-up removes them with it.
 */
export async function insertInsightRuns(
  assetId: string,
  model: string,
  fixtures: InsightFixture[],
) {
  for (const [i, f] of fixtures.entries()) {
    const runId = crypto.randomUUID();
    await db().query(
      `insert into ai_runs (id, asset_id, created_at, model, status, error_kind, duration_ms,
         input_tokens, output_tokens, cost_usd)
       values ($1, $2, now() - ($3 || ' minutes')::interval, $4, $5, $6, $7, $8, $9, $10)`,
      [
        runId, assetId, String(fixtures.length - i), model, f.status,
        f.status === "failed" ? "model-call" : null,
        f.durationMs, f.inputTokens, f.outputTokens, f.costUsd,
      ],
    );
    if (f.workOrder) {
      await db().query(
        `insert into work_orders (id, asset_id, notes, ai_draft, final, changed_fields, model, ai_run_id)
         values ($1, $2, 'E2E insights', $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(), assetId, JSON.stringify(f.workOrder.aiDraft),
          JSON.stringify(f.workOrder.final), JSON.stringify(f.workOrder.changedFields),
          model, runId,
        ],
      );
    }
  }
}

/** Removes what `insertInsightRuns` added for one model. */
export async function removeInsightRuns(model: string) {
  await db().query(
    "delete from work_orders where ai_run_id in (select id from ai_runs where model = $1)",
    [model],
  );
  await db().query("delete from ai_runs where model = $1", [model]);
}
