import type { WorkOrderRecord } from "@/db/work-orders";
import { changedFields } from "@/lib/changed-fields";
import type { PhotoStore } from "@/lib/photo-store";
import { ACCEPTED_TYPES, MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/photo-rules";
import {
  workOrderRequestSchema,
  type TriageDraft,
  type WorkOrderRequest,
} from "@/lib/schema";

// Saving an approved work order (R21, R22, R24, R25, R27, R28; technical plan
// v2, section 5). Kept apart from the route and the database so the order of
// steps, and the clean-up when one fails, can be unit tested.

// Dates on the history timeline have no time. The demo sites are in eastern
// Australia, so "today" is taken there rather than in UTC, which would put a
// morning approval on the previous day.
export const APP_TIME_ZONE = "Australia/Sydney";

export type IncomingPhoto = { body: Blob; contentType: string };

export type SaveDeps = {
  store: Pick<PhotoStore, "put" | "delete">;
  /** Writes the record in one transaction; throws if any part fails. */
  persist: (record: WorkOrderRecord) => Promise<void>;
  newId?: () => string;
  now?: () => Date;
};

export class PhotoUploadError extends Error {}

/**
 * Uploads the photos, then saves the work order, its history entry, its photo
 * rows and any status change together. If an upload or the transaction fails,
 * the photos already uploaded are deleted, so a failed save leaves nothing
 * behind (R27).
 */
export async function saveWorkOrder(
  request: WorkOrderRequest,
  photos: readonly IncomingPhoto[],
  {
    store,
    persist,
    newId = () => crypto.randomUUID(),
    now = () => new Date(),
  }: SaveDeps,
): Promise<{ workOrderId: string }> {
  const workOrderId = newId();
  const approvedAt = now();

  const uploads = await Promise.allSettled(
    photos.map((photo, position) =>
      store.put(
        `work-orders/${workOrderId}/${position + 1}${extensionFor(photo.contentType)}`,
        photo.body,
        photo.contentType,
      ),
    ),
  );
  const uploaded = uploads.flatMap((u) => (u.status === "fulfilled" ? [u.value] : []));
  if (uploaded.length < photos.length) {
    await cleanUp(store, uploaded);
    throw new PhotoUploadError("A photo could not be uploaded.");
  }

  const record = buildRecord({
    request,
    workOrderId,
    historyEntryId: newId(),
    photoIds: uploaded.map(() => newId()),
    blobPaths: uploaded,
    approvedAt,
  });

  try {
    await persist(record);
  } catch (error) {
    await cleanUp(store, uploaded);
    throw error;
  }
  return { workOrderId };
}

async function cleanUp(store: SaveDeps["store"], paths: string[]) {
  try {
    await store.delete(paths);
  } catch (error) {
    // The save has already failed; report that rather than the clean-up.
    console.error("Could not delete uploaded photos", paths, error);
  }
}

export function buildRecord({
  request,
  workOrderId,
  historyEntryId,
  photoIds,
  blobPaths,
  approvedAt,
}: {
  request: WorkOrderRequest;
  workOrderId: string;
  historyEntryId: string;
  photoIds: string[];
  blobPaths: string[];
  approvedAt: Date;
}): WorkOrderRecord {
  const { final } = request;
  return {
    workOrder: {
      id: workOrderId,
      assetId: request.assetId,
      approvedAt,
      notes: request.notes,
      aiDraft: request.aiDraft,
      final,
      changedFields: changedFields(request.aiDraft, final),
      model: request.model,
    },
    historyEntry: {
      id: historyEntryId,
      assetId: request.assetId,
      date: dateIn(APP_TIME_ZONE, approvedAt),
      kind: "work-order",
      title: final.workOrder.title,
      detail: historyDetail(final),
      component: final.issue.component.trim() || null,
      severity: final.issue.severity,
      status: "open",
      seeded: false,
      workOrderId,
    },
    photos: blobPaths.map((blobPath, i) => ({
      id: photoIds[i],
      workOrderId,
      blobPath,
      position: i + 1,
    })),
    takeOutOfService: final.workOrder.takeOutOfService,
  };
}

/** The line shown under the work order's title on the asset's history. */
export function historyDetail(final: TriageDraft): string {
  const { issue, workOrder } = final;
  const parts = [
    sentence(issue.title),
    sentence(issue.description),
    `Priority ${workOrder.priority}, about ${workOrder.estimatedHours} h.`,
    workOrder.takeOutOfService ? "Taken out of service." : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** "YYYY-MM-DD" for the given instant in a time zone. */
export function dateIn(timeZone: string, instant: Date): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

export type ParsedRequest =
  | { ok: true; request: WorkOrderRequest; photos: IncomingPhoto[] }
  | { ok: false; message: string };

/**
 * Reads the multipart body: a `payload` field holding the JSON request and up
 * to 3 `photos` files, in order.
 */
export function parseWorkOrderForm(form: FormData): ParsedRequest {
  const payload = form.get("payload");
  if (typeof payload !== "string") {
    return { ok: false, message: "The work order was missing from the request." };
  }

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return { ok: false, message: "The work order could not be read." };
  }
  const parsed = workOrderRequestSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      message: `The work order is not complete: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}.`,
    };
  }

  const files = form.getAll("photos");
  if (files.length > MAX_PHOTOS) {
    return { ok: false, message: `A work order can have up to ${MAX_PHOTOS} photos.` };
  }
  const photos: IncomingPhoto[] = [];
  for (const file of files) {
    if (typeof file === "string") {
      return { ok: false, message: "A photo could not be read." };
    }
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, message: "Photos must be JPEG, PNG or WebP images." };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { ok: false, message: "A photo is larger than 5 MB." };
    }
    photos.push({ body: file, contentType: file.type });
  }

  return { ok: true, request: parsed.data, photos };
}
