import { describe, expect, test, vi } from "vitest";
import type { WorkOrderRecord } from "@/db/work-orders";
import { blankDraft, type TriageDraft, type WorkOrderRequest } from "@/lib/schema";
import {
  dateIn,
  historyDetail,
  parseWorkOrderForm,
  PhotoUploadError,
  saveWorkOrder,
  type SaveDeps,
} from "./save-work-order";

function finalDraft(): TriageDraft {
  const draft = blankDraft();
  draft.issue = {
    title: "Hydraulic hose leak at boom",
    description: "Oil weeping from the boom cylinder hose",
    component: "Boom hydraulics",
    severity: "high",
    severityReason: "Hose under pressure could burst.",
    safeToOperate: false,
  };
  draft.workOrder = {
    title: "Replace boom hose",
    priority: "urgent",
    tasks: ["Isolate hydraulics", "Replace hose"],
    parts: ["Hydraulic hose"],
    estimatedHours: 2.5,
    takeOutOfService: true,
  };
  return draft;
}

const manualRequest = (): WorkOrderRequest => ({
  assetId: "EX-014",
  notes: "Oil under the boom",
  aiDraft: null,
  final: finalDraft(),
  model: null,
});

const photo = (name = "x") => ({
  body: new Blob([name], { type: "image/jpeg" }),
  contentType: "image/jpeg",
});

function fakeDeps(overrides: Partial<SaveDeps> = {}) {
  let n = 0;
  const store = {
    put: vi.fn(async (pathname: string) => pathname),
    delete: vi.fn(async () => {}),
  };
  const persist = vi.fn<(record: WorkOrderRecord) => Promise<void>>(async () => {});
  return {
    store,
    persist,
    deps: {
      store,
      persist,
      newId: () => `id-${++n}`,
      // 11 Nov 2026, 9am in Sydney, which is still 10 Nov in UTC.
      now: () => new Date("2026-11-10T22:00:00Z"),
      ...overrides,
    } satisfies SaveDeps,
  };
}

describe("saveWorkOrder", () => {
  test("uploads photos, then saves the work order, history entry and status change together", async () => {
    const { store, persist, deps } = fakeDeps();

    const result = await saveWorkOrder(manualRequest(), [photo(), photo()], deps);

    expect(result).toEqual({ workOrderId: "id-1" });
    expect(store.put).toHaveBeenCalledTimes(2);
    expect(store.put.mock.calls.map((c) => c[0])).toEqual([
      "work-orders/id-1/1.jpg",
      "work-orders/id-1/2.jpg",
    ]);
    expect(persist).toHaveBeenCalledTimes(1);

    const record = persist.mock.calls[0][0];
    expect(record.workOrder).toMatchObject({
      id: "id-1",
      assetId: "EX-014",
      notes: "Oil under the boom",
      aiDraft: null,
      model: null,
      changedFields: [],
    });
    expect(record.historyEntry).toMatchObject({
      kind: "work-order",
      date: "2026-11-11",
      title: "Replace boom hose",
      component: "Boom hydraulics",
      severity: "high",
      status: "open",
      workOrderId: "id-1",
    });
    expect(record.photos).toEqual([
      { id: "id-3", workOrderId: "id-1", blobPath: "work-orders/id-1/1.jpg", position: 1 },
      { id: "id-4", workOrderId: "id-1", blobPath: "work-orders/id-1/2.jpg", position: 2 },
    ]);
    expect(record.takeOutOfService).toBe(true);
    expect(store.delete).not.toHaveBeenCalled();
  });

  test("records the fields changed from an AI draft", async () => {
    const { persist, deps } = fakeDeps();
    const aiDraft = finalDraft();
    aiDraft.issue.severity = "medium";

    await saveWorkOrder(
      { ...manualRequest(), aiDraft, model: "anthropic/claude-sonnet-5.5" },
      [],
      deps,
    );

    expect(persist.mock.calls[0][0].workOrder.changedFields).toEqual([
      "issue.severity",
    ]);
  });

  test("a failed transaction deletes the photos it uploaded", async () => {
    const { store, deps } = fakeDeps({
      persist: async () => {
        throw new Error("connection lost");
      },
    });

    await expect(
      saveWorkOrder(manualRequest(), [photo(), photo()], deps),
    ).rejects.toThrow("connection lost");

    expect(store.delete).toHaveBeenCalledWith([
      "work-orders/id-1/1.jpg",
      "work-orders/id-1/2.jpg",
    ]);
  });

  test("a failed upload deletes the others and saves nothing", async () => {
    const { store, persist, deps } = fakeDeps();
    store.put.mockImplementation(async (pathname: string) => {
      if (pathname.endsWith("/2.jpg")) throw new Error("upload failed");
      return pathname;
    });

    await expect(
      saveWorkOrder(manualRequest(), [photo(), photo(), photo()], deps),
    ).rejects.toBeInstanceOf(PhotoUploadError);

    expect(persist).not.toHaveBeenCalled();
    expect(store.delete).toHaveBeenCalledWith([
      "work-orders/id-1/1.jpg",
      "work-orders/id-1/3.jpg",
    ]);
  });
});

test("historyDetail summarises the issue and work order", () => {
  expect(historyDetail(finalDraft())).toBe(
    "Hydraulic hose leak at boom. Oil weeping from the boom cylinder hose. Priority urgent, about 2.5 h. Taken out of service.",
  );
});

test("dateIn gives the calendar date in that time zone", () => {
  const instant = new Date("2026-11-10T22:00:00Z");
  expect(dateIn("Australia/Sydney", instant)).toBe("2026-11-11");
  expect(dateIn("UTC", instant)).toBe("2026-11-10");
});

describe("parseWorkOrderForm", () => {
  function form(payload: unknown, files: File[] = []) {
    const data = new FormData();
    if (payload !== undefined) {
      data.set("payload", typeof payload === "string" ? payload : JSON.stringify(payload));
    }
    files.forEach((file) => data.append("photos", file));
    return data;
  }
  const jpeg = (size = 10) =>
    new File([new Uint8Array(size)], "p.jpg", { type: "image/jpeg" });

  test("reads the request and photos", () => {
    const result = parseWorkOrderForm(form(manualRequest(), [jpeg(), jpeg()]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.assetId).toBe("EX-014");
      expect(result.photos).toHaveLength(2);
    }
  });

  test("refuses a missing or unreadable payload", () => {
    expect(parseWorkOrderForm(form(undefined))).toMatchObject({ ok: false });
    expect(parseWorkOrderForm(form("{not json"))).toMatchObject({ ok: false });
  });

  test("refuses an incomplete draft and says which fields", () => {
    const request = manualRequest();
    request.final.issue.title = "";
    expect(parseWorkOrderForm(form(request))).toEqual({
      ok: false,
      message: "The work order is not complete: final.issue.title.",
    });
  });

  test("refuses more than 3 photos, non-images and oversized photos", () => {
    expect(
      parseWorkOrderForm(form(manualRequest(), [jpeg(), jpeg(), jpeg(), jpeg()])),
    ).toMatchObject({ ok: false });
    expect(
      parseWorkOrderForm(
        form(manualRequest(), [new File(["x"], "a.pdf", { type: "application/pdf" })]),
      ),
    ).toMatchObject({ ok: false });
    expect(
      parseWorkOrderForm(form(manualRequest(), [jpeg(5 * 1024 * 1024 + 1)])),
    ).toMatchObject({ ok: false, message: "A photo is larger than 5 MB." });
  });
});
