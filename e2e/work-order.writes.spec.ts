import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import {
  assetStatus,
  localPhotoFolders,
  removeWorkOrders,
  usesLocalPhotos,
  workOrderCount,
  workOrderIds,
} from "./support/db";

// Work order from issue (M4: R20 to R22, R24 to R28). These tests write to the
// shared database, so they run after the read-only specs (see
// playwright.config.ts), each browser project uses its own filler asset (not
// one of the four demo assets), and each test removes what it created.
const assetFor = (project: string) => (project.startsWith("tablet") ? "SS-008" : "LT-002");

// Tests on the same asset would see each other's work orders, and one test's
// clean-up could remove another's, so this file runs in order within each
// project. The two projects use different assets and still run side by side.
test.describe.configure({ mode: "default" });

const photo = (name: string) =>
  path.join(__dirname, "..", "demo-files", "photos", name);

let assetId: string;
let startStatus: string;

test.beforeEach(async ({ page }, testInfo) => {
  assetId = assetFor(testInfo.project.name);
  startStatus = await assetStatus(assetId);
  await page.goto(`/asset/${assetId}`);
  await expect(page.getByLabel("Add photos")).toBeEnabled();
});

test.afterEach(async () => {
  await removeWorkOrders(assetId, startStatus);
});

async function reportAndFill(page: Page, title: string) {
  await page.getByLabel("Add photos").setInputFiles(photo("telehandler-tyre-cut.jpg"));
  await expect(page.getByRole("img", { name: /^Photo 1:/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Notes" }).fill("Deep cut in the front left tyre");
  await page.getByRole("button", { name: "Continue" }).click();

  const form = page.getByRole("form", { name: "Issue and work order" });
  await form.getByRole("textbox", { name: "Title", exact: true }).fill("Cut in front left tyre");
  await form.getByRole("textbox", { name: /^Component/ }).fill("Front left tyre");
  await form.getByText("High", { exact: true }).click();
  await form.getByRole("group", { name: "Safe to operate" }).getByText("No").click();
  await form.getByRole("textbox", { name: "Work order title" }).fill(title);
  await form.getByText("Urgent", { exact: true }).click();
  await form.getByRole("textbox", { name: /^Tasks/ }).fill("Inspect tyre\nReplace tyre");
  await form.getByRole("textbox", { name: "Estimated hours" }).fill("1.5");
  await form.getByText("Take the asset out of service").click();
  return form;
}

const history = (page: Page) => page.getByRole("list", { name: "History" });

test("an approved work order is saved with its photo, survives a refresh and shows in a second browser", async ({
  page,
  browser,
}, testInfo) => {
  const title = `Replace tyre (${testInfo.project.name})`;
  await reportAndFill(page, title);
  await page.getByRole("button", { name: "Approve work order" }).click();

  await expect(page.getByRole("heading", { name: "Work order saved" })).toBeVisible();

  async function expectSaved(p: Page) {
    const entry = history(p).getByRole("listitem").filter({ hasText: title });
    await expect(entry).toHaveCount(1);
    await expect(entry).toContainText("Work order");
    // The asset was taken out of service in the same save (R25).
    await expect(
      p.getByRole("region", { name: "Key facts" }).getByText("Out of service"),
    ).toBeVisible();
    // The photo was stored and reads back (R28).
    const img = entry.getByRole("img", { name: `Photo 1 for ${title}` });
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }

  // Shown straight away, then after a refresh, then in a separate browser (R26).
  await expectSaved(page);
  await page.reload();
  await expectSaved(page);

  const other = await browser.newContext();
  try {
    const second = await other.newPage();
    await second.goto(`/asset/${assetId}`);
    await expectSaved(second);
  } finally {
    await other.close();
  }
});

test("discarding saves nothing", async ({ page }, testInfo) => {
  const before = await workOrderCount(assetId);
  const title = `Discarded order (${testInfo.project.name})`;
  await reportAndFill(page, title);

  await page.getByRole("button", { name: "Discard" }).click();

  await expect(
    page.getByRole("region", { name: "Report a defect" }).getByRole("status"),
  ).toHaveText("Report discarded. Nothing was saved.");
  await expect(page.getByRole("textbox", { name: "Notes" })).toHaveValue("");
  await page.reload();
  await expect(history(page)).not.toContainText(title);
  expect(await workOrderCount(assetId)).toBe(before);
  expect(await assetStatus(assetId)).toBe(startStatus);
});

test("a failed save tells the reviewer and keeps the form", async ({ page }) => {
  await page.route("**/api/work-orders", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "The work order could not be saved, so nothing was kept. Try again." },
    }),
  );
  const form = await reportAndFill(page, "Will not save");
  await page.getByRole("button", { name: "Approve work order" }).click();

  await expect(form.getByRole("alert")).toHaveText(
    "The work order could not be saved, so nothing was kept. Try again.",
  );
  await expect(form.getByRole("textbox", { name: "Work order title" })).toHaveValue(
    "Will not save",
  );
});

test("a save the database refuses leaves no rows or photos behind", async ({
  request,
}) => {
  const before = await workOrderCount(assetId);
  const photosBefore = new Set(await localPhotoFolders());

  // Postgres refuses a NUL character in text, so the transaction fails after
  // the photo has been uploaded.
  const final = {
    issue: {
      title: "Bad\u0000title",
      description: "",
      component: "",
      severity: "low",
      severityReason: "",
      safeToOperate: true,
    },
    photoObservations: [],
    repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
    workOrder: {
      title: "Bad\u0000order",
      priority: "routine",
      tasks: ["x"],
      parts: [],
      estimatedHours: 1,
      takeOutOfService: true,
    },
    confidence: "high",
    clarifyingQuestion: null,
  };
  const response = await request.post("/api/work-orders", {
    multipart: {
      payload: JSON.stringify({ assetId, notes: "", aiDraft: null, final, model: null }),
      photos: {
        name: "photo-1.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      },
    },
  });

  expect(response.status()).toBe(500);
  expect((await response.json()).error).toContain("nothing was kept");
  expect(await workOrderCount(assetId)).toBe(before);
  expect(await assetStatus(assetId)).toBe(startStatus);

  if (usesLocalPhotos) {
    // Any new photo folder must belong to a saved work order. Another test
    // may be part way through its own save, so allow a moment for it to commit.
    await expect
      .poll(async () => {
        const saved = await workOrderIds();
        return (await localPhotoFolders()).filter(
          (id) => !photosBefore.has(id) && !saved.has(id),
        );
      })
      .toEqual([]);
  }
});
