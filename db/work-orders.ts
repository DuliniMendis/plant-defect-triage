import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import type { TriageDraft } from "@/lib/schema";
import { getDb } from "./client";
import {
  aiRuns,
  assets,
  historyEntries,
  workOrderPhotos,
  workOrders,
  type WorkOrderPhoto,
} from "./schema";

/** Everything written in the one transaction. */
export type WorkOrderRecord = {
  workOrder: {
    id: string;
    assetId: string;
    approvedAt: Date;
    notes: string;
    aiDraft: TriageDraft | null;
    final: TriageDraft;
    changedFields: string[];
    model: string | null;
    aiRunId: string | null;
  };
  historyEntry: {
    id: string;
    assetId: string;
    date: string;
    kind: "work-order";
    title: string;
    detail: string;
    component: string | null;
    severity: TriageDraft["issue"]["severity"];
    status: "open";
    seeded: false;
    workOrderId: string;
  };
  photos: { id: string; workOrderId: string; blobPath: string; position: number }[];
  takeOutOfService: boolean;
};

export class UnknownAssetError extends Error {}

/** The AI run sent with an approval cannot be linked to this work order (R40). */
export class InvalidAiRunError extends Error {}

/**
 * Writes an approved work order, its history entry, its photo rows and any
 * status change in one transaction (R24, R25, R27). Nothing is kept if any
 * part fails.
 */
export async function insertWorkOrder(record: WorkOrderRecord): Promise<void> {
  await getDb().transaction(async (tx) => {
    const [asset] = await tx
      .select({ meterHours: assets.meterHours })
      .from(assets)
      .where(eq(assets.id, record.workOrder.assetId))
      .limit(1);
    if (!asset) {
      throw new UnknownAssetError(`No asset ${record.workOrder.assetId}`);
    }

    // Only a succeeded run for the same asset, not yet linked to another work
    // order, can be linked (data model draft 3). The unique constraint on
    // ai_run_id also guards against two approvals at once.
    const { aiRunId } = record.workOrder;
    if (aiRunId) {
      const [run] = await tx
        .select({ assetId: aiRuns.assetId, status: aiRuns.status })
        .from(aiRuns)
        .where(eq(aiRuns.id, aiRunId))
        .limit(1);
      if (!run || run.assetId !== record.workOrder.assetId || run.status !== "succeeded") {
        throw new InvalidAiRunError(`AI run ${aiRunId} cannot be linked`);
      }
      const [linked] = await tx
        .select({ id: workOrders.id })
        .from(workOrders)
        .where(eq(workOrders.aiRunId, aiRunId))
        .limit(1);
      if (linked) {
        throw new InvalidAiRunError(`AI run ${aiRunId} is already linked`);
      }
    }

    await tx.insert(workOrders).values(record.workOrder);
    await tx
      .insert(historyEntries)
      .values({ ...record.historyEntry, meterHours: asset.meterHours });
    if (record.photos.length > 0) {
      await tx.insert(workOrderPhotos).values(record.photos);
    }
    if (record.takeOutOfService) {
      await tx
        .update(assets)
        .set({ status: "out-of-service" })
        .where(eq(assets.id, record.workOrder.assetId));
    }
  });
}

/** Photos for every work order on an asset, keyed by work order ID, in order. */
export async function getWorkOrderPhotos(
  assetId: string,
): Promise<Record<string, Pick<WorkOrderPhoto, "id" | "position">[]>> {
  const rows = await getDb()
    .select({
      id: workOrderPhotos.id,
      position: workOrderPhotos.position,
      workOrderId: workOrderPhotos.workOrderId,
    })
    .from(workOrderPhotos)
    .innerJoin(workOrders, eq(workOrders.id, workOrderPhotos.workOrderId))
    .where(eq(workOrders.assetId, assetId))
    .orderBy(asc(workOrderPhotos.position));

  const byWorkOrder: Record<string, Pick<WorkOrderPhoto, "id" | "position">[]> = {};
  for (const { workOrderId, ...photo } of rows) {
    (byWorkOrder[workOrderId] ??= []).push(photo);
  }
  return byWorkOrder;
}

/** Where one photo is stored, or undefined when there is no such photo. */
export async function getWorkOrderPhotoPath(
  id: string,
): Promise<string | undefined> {
  const [row] = await getDb()
    .select({ blobPath: workOrderPhotos.blobPath })
    .from(workOrderPhotos)
    .where(eq(workOrderPhotos.id, id))
    .limit(1);
  return row?.blobPath;
}

/**
 * An asset's approved work orders, newest first. The triage route takes parts
 * and estimated hours from the latest one on the same component rather than
 * asking the model to guess them.
 */
export async function getPastWorkOrders(
  assetId: string,
): Promise<{ id: string; approvedAt: Date; final: TriageDraft }[]> {
  return getDb()
    .select({ id: workOrders.id, approvedAt: workOrders.approvedAt, final: workOrders.final })
    .from(workOrders)
    .where(eq(workOrders.assetId, assetId))
    .orderBy(desc(workOrders.approvedAt));
}
