import { expect, test } from "@playwright/test";
import { historyIds, insertIssue, workOrderCount } from "./support/db";
import { tempAssetFor } from "./support/temp-assets";

// Deleting an issue from the asset's history, with its work order if it has
// one. Each browser project uses its own temporary asset made for this run
// (e2e/support/temp-assets.ts), which is removed after the run.
const assetFor = (project: string) => tempAssetFor("DEL", project);

// Tests on the same asset would see each other's issues, so this file runs in
// order within each project.
test.describe.configure({ mode: "default" });

test("Cancel keeps the issue; confirming deletes it", async ({ page }, testInfo) => {
  const assetId = assetFor(testInfo.project.name);
  const { entryId } = await insertIssue(assetId, "E2E rattle from the cab");
  await page.goto(`/asset/${assetId}`);

  const history = page.getByRole("list", { name: "History" });
  const issue = history.getByRole("heading", { name: "E2E rattle from the cab" });
  await expect(issue).toBeVisible();

  await page.getByRole("button", { name: "Delete E2E rattle from the cab" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this issue?" });
  await expect(dialog).toContainText("E2E rattle from the cab will be removed from the history.");
  await expect(dialog).not.toContainText("work order");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(issue).toBeVisible();
  expect(await historyIds(assetId)).toContain(entryId);

  await page.getByRole("button", { name: "Delete E2E rattle from the cab" }).click();
  await dialog.getByRole("button", { name: "Delete issue" }).click();
  await expect(dialog).toBeHidden();
  await expect(issue).toBeHidden();
  await expect(page.getByRole("heading", { name: "History" })).toBeFocused();
  expect(await historyIds(assetId)).not.toContain(entryId);
});

test("deleting an issue also deletes its work order", async ({ page }, testInfo) => {
  const assetId = assetFor(testInfo.project.name);
  const startCount = await workOrderCount(assetId);
  const { entryId } = await insertIssue(assetId, "E2E replace seat belt", {
    withWorkOrder: true,
  });
  expect(await workOrderCount(assetId)).toBe(startCount + 1);
  await page.goto(`/asset/${assetId}`);

  await page.getByRole("button", { name: "Delete E2E replace seat belt" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this issue?" });
  await expect(dialog).toContainText("Its work order and photos will be deleted too.");
  await dialog.getByRole("button", { name: "Delete issue" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "E2E replace seat belt" })).toBeHidden();
  expect(await historyIds(assetId)).not.toContain(entryId);
  expect(await workOrderCount(assetId)).toBe(startCount);
});
