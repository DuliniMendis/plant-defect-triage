import { beforeEach, expect, test, vi } from "vitest";
import { deleteIssue } from "./delete-issue";

const mocks = vi.hoisted(() => ({
  deleteHistoryEntry: vi.fn(),
  deletePhotos: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/db/history", () => ({ deleteHistoryEntry: mocks.deleteHistoryEntry }));
vi.mock("@/lib/photo-store", () => ({
  getPhotoStore: () => ({ delete: mocks.deletePhotos }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

test("deletes only issue and work order entries", async () => {
  mocks.deleteHistoryEntry.mockResolvedValue({ workOrderId: null, photoPaths: [] });

  await expect(deleteIssue("EX-014", "h-1")).resolves.toEqual({ ok: true });

  expect(mocks.deleteHistoryEntry).toHaveBeenCalledWith("EX-014", "h-1", [
    "issue",
    "work-order",
  ]);
  expect(mocks.refresh).toHaveBeenCalled();
});

test("removes the photos of the work order it deleted", async () => {
  mocks.deleteHistoryEntry.mockResolvedValue({
    workOrderId: "wo-1",
    photoPaths: ["work-orders/wo-1/1.jpg", "work-orders/wo-1/2.jpg"],
  });

  await expect(deleteIssue("EX-014", "h-1")).resolves.toEqual({ ok: true });

  expect(mocks.deletePhotos).toHaveBeenCalledWith([
    "work-orders/wo-1/1.jpg",
    "work-orders/wo-1/2.jpg",
  ]);
});

test("still succeeds when the photo files cannot be removed", async () => {
  mocks.deleteHistoryEntry.mockResolvedValue({ workOrderId: "wo-1", photoPaths: ["a.jpg"] });
  mocks.deletePhotos.mockRejectedValue(new Error("store down"));

  await expect(deleteIssue("EX-014", "h-1")).resolves.toEqual({ ok: true });
});

test("says so when the entry is not there", async () => {
  mocks.deleteHistoryEntry.mockResolvedValue(null);

  const result = await deleteIssue("EX-014", "missing");

  expect(result).toEqual({ ok: false, message: expect.stringMatching(/no longer in the history/) });
  expect(mocks.refresh).toHaveBeenCalled();
});

test("reports a database failure without touching photos", async () => {
  mocks.deleteHistoryEntry.mockRejectedValue(new Error("connection lost"));

  const result = await deleteIssue("EX-014", "h-1");

  expect(result).toEqual({ ok: false, message: expect.stringMatching(/could not be deleted/) });
  expect(mocks.deletePhotos).not.toHaveBeenCalled();
});

test("rejects arguments that are not strings", async () => {
  const result = await deleteIssue({ id: "EX-014" }, 42);

  expect(result.ok).toBe(false);
  expect(mocks.deleteHistoryEntry).not.toHaveBeenCalled();
});
