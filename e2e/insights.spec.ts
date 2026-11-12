import { expect, test } from "@playwright/test";
import { blankDraft, type Severity } from "../lib/schema";
import { insertInsightRuns, removeInsightRuns } from "./support/db";
import { currentRunTag, tempInsightsAsset } from "./support/temp-assets";

// Insights page (R41 to R43). Runs and work orders are written straight to the
// database under a model name only this test uses, so narrowing the page to
// that model shows exactly these figures, whatever else the shared database
// holds. They sit on a temporary asset, so the run's clean-up removes them too.

function draft(severity: Severity) {
  const d = blankDraft();
  d.issue.title = "Boom hose leak";
  d.issue.severity = severity;
  d.workOrder.title = "Replace boom hose";
  return d;
}

test.describe("Insights", () => {
  let model: string;

  test.beforeEach(async ({}, testInfo) => {
    // Unique to this test and browser project, as tests run in parallel.
    model = `e2e/${currentRunTag()}-${testInfo.testId}`.toLowerCase();
    await insertInsightRuns(tempInsightsAsset(), model, [
      // Approved unchanged.
      {
        status: "succeeded",
        durationMs: 4000,
        inputTokens: 4000,
        outputTokens: 500,
        costUsd: 0.01,
        workOrder: { aiDraft: draft("medium"), final: draft("medium"), changedFields: [] },
      },
      // Approved with severity raised and tasks changed.
      {
        status: "succeeded",
        durationMs: 6000,
        inputTokens: 6000,
        outputTokens: 900,
        costUsd: 0.03,
        workOrder: {
          aiDraft: draft("medium"),
          final: draft("high"),
          changedFields: ["issue.severity", "workOrder.tasks"],
        },
      },
      // Discarded; its cost has not been reported yet.
      { status: "succeeded", durationMs: 8000, inputTokens: 5000, outputTokens: 700, costUsd: null },
      // Failed.
      { status: "failed", durationMs: 60000, inputTokens: null, outputTokens: null, costUsd: null },
    ]);
  });

  test.afterEach(async () => {
    await removeInsightRuns(model);
  });

  test("shows cost, time, approval and edit figures for one model", async ({ page }) => {
    await page.goto(`/insights?${new URLSearchParams({ model })}`);
    await expect(page.getByRole("heading", { level: 1, name: "AI draft insights" })).toBeVisible();

    const filter = page.getByRole("navigation", { name: "Model" });
    await expect(filter.getByRole("link", { name: model })).toHaveAttribute("aria-current", "page");
    await expect(filter.getByRole("link", { name: "All models" })).toBeVisible();

    const requests = page.getByRole("region", { name: "Requests and approval" });
    await expect(requests).toContainText("Draft requests4");
    await expect(requests).toContainText("1 failed");
    await expect(requests).toContainText("Approved67%");
    await expect(requests).toContainText("2 of 3 drafts");

    // Succeeded runs only: 4, 6 and 8 seconds.
    const time = page.getByRole("region", { name: "Request time" });
    await expect(time).toContainText("p50 (median)6.0 s");
    await expect(time).toContainText("p957.8 s");
    await expect(time).toContainText("Over 3 succeeded drafts. Indicative only");

    const cost = page.getByRole("region", { name: "Cost" });
    await expect(cost).toContainText("Per draft$0.0200");
    await expect(cost).toContainText("Total spent$0.0400");
    await expect(cost).toContainText("Cost not known yet for 2 requests");
    await expect(cost).toContainText("5,000 in, 700 out");

    const edits = page.getByRole("region", { name: "Reviewer edits" });
    await expect(edits).toContainText("Approved with no changes50%");
    await expect(edits).toContainText("Fields changed per draft1");
    await expect(edits).toContainText("1 raised, 0 lowered");
    const table = edits.getByRole("table", { name: "Times each field was changed" });
    const row = (field: string) =>
      table
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name: field, exact: true }) });
    await expect(row("Severity")).toContainText("1");
    await expect(row("Tasks")).toContainText("1");
    await expect(row("Severity reason")).toContainText("0");
  });
});

test("is linked from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Insights" }).click();
  await expect(page).toHaveURL(/\/insights$/);
  await expect(page.getByRole("heading", { level: 1, name: "AI draft insights" })).toBeVisible();
});
