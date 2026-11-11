import { expect, test } from "@playwright/test";
import type { TriageResponse } from "../lib/schema";
import { assetStatus, latestWorkOrder, removeWorkOrders } from "./support/db";
import { tempAssetFor } from "./support/temp-assets";

// AI fills the form, then manual edit (M6: R12 to R15, R17 to R20, R22, R28).
//
// The AI call itself is replaced with a fixed response in the browser, so the
// test is fast, free and always gives the same draft. The real model call is
// covered by the route's unit tests and a live check. Approval goes to the real
// POST /api/work-orders, so what is stored is checked for real. Each browser
// project uses its own temporary asset made for this run
// (e2e/support/temp-assets.ts), and the test removes what it created.
const assetFor = (project: string) => tempAssetFor("AI", project);

const draft: TriageResponse = {
  draft: {
    issue: {
      title: "Hydraulic leak at bucket cylinder",
      description: "Oil weeping from the bucket cylinder rod seal.",
      component: "Bucket hydraulics",
      severity: "medium",
      severityReason: "Slow leak with no loss of function yet.",
      safeToOperate: true,
    },
    photoObservations: ["Oil film on the cylinder rod"],
    repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
    workOrder: {
      title: "Reseal bucket cylinder",
      priority: "routine",
      tasks: ["Isolate the machine", "Replace rod seal", "Test under load"],
      parts: ["Rod seal kit"],
      estimatedHours: 3,
      takeOutOfService: false,
    },
    confidence: "high",
    clarifyingQuestion: null,
  },
  model: "anthropic/claude-sonnet-5.5",
  durationMs: 8200,
  filled: [
    { path: "workOrder.priority", source: "rule", note: "Set from medium severity." },
    {
      path: "workOrder.takeOutOfService",
      source: "rule",
      note: "Left in service because it is safe to operate.",
    },
  ],
};

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

test("an AI draft fills the form, the reviewer edits a field and approves, and the change is recorded", async ({
  page,
}, testInfo) => {
  let sent = "";
  await page.route("**/api/triage", async (route) => {
    sent = route.request().postDataBuffer()?.toString() ?? "";
    await route.fulfill({ json: draft });
  });

  await page.getByRole("textbox", { name: "Notes" }).fill("Oil on the bucket cylinder");
  await page.getByRole("button", { name: "Draft with AI" }).click();

  const form = page.getByRole("form", { name: "Issue and work order" });
  await expect(page.getByRole("heading", { name: /Issue and work order/ })).toContainText(
    "AI draft",
  );
  // The report went to the triage route as multipart form data.
  expect(sent).toContain(assetId);
  expect(sent).toContain("Oil on the bucket cylinder");
  await expect(form.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(
    "Hydraulic leak at bucket cylinder",
  );
  await expect(page.getByRole("region", { name: "AI findings" })).toContainText(
    "Oil film on the cylinder rod",
  );
  await expect(form.getByText("Set from medium severity.")).toBeVisible();

  // The reviewer overrules the AI on severity and the work order title.
  const title = `Reseal bucket cylinder (${testInfo.project.name})`;
  await form.getByText("High", { exact: true }).click();
  await form.getByRole("textbox", { name: "Work order title" }).fill(title);
  await page.getByRole("button", { name: "Approve work order" }).click();

  await expect(page.getByRole("heading", { name: "Work order saved" })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "History" }).getByRole("listitem").filter({ hasText: title }),
  ).toHaveCount(1);

  const saved = await latestWorkOrder(assetId);
  expect(saved?.model).toBe("anthropic/claude-sonnet-5.5");
  expect(saved?.ai_draft).toEqual(draft.draft);
  expect(saved?.changed_fields.sort()).toEqual(["issue.severity", "workOrder.title"]);
});

test("when the AI draft fails, the form can still be filled in by hand", async ({ page }) => {
  await page.route("**/api/triage", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "The AI draft could not be made. Try again, or fill in the form by hand." },
    }),
  );
  await page.getByRole("textbox", { name: "Notes" }).fill("Oil on the bucket cylinder");
  await page.getByRole("button", { name: "Draft with AI" }).click();

  await expect(
    page.getByRole("region", { name: "Report a defect" }).getByRole("alert"),
  ).toContainText("The AI draft could not be made.");
  await expect(page.getByRole("button", { name: "Try the AI draft again" })).toBeVisible();
  await page.getByRole("button", { name: "Fill in by hand" }).click();
  await expect(
    page.getByRole("form", { name: "Issue and work order" }).getByRole("textbox", {
      name: "Title",
      exact: true,
    }),
  ).toHaveValue("");
});
