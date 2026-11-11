import { expect, test, type Page } from "@playwright/test";
import type { TriageResponse } from "../lib/schema";

// AI repeat check and clarifying question (M7: R16, R18, R23).
//
// The AI call is replaced with fixed responses in the browser, as in
// ai-draft.writes.spec.ts, so the test is fast, free and repeatable. Nothing is
// approved, so no data is written. The live model was checked by hand against
// the sample photos in demo-files/photos.

const base: TriageResponse["draft"] = {
  issue: {
    title: "Hydraulic hose leak at boom fitting",
    description: "Oil dripping from the boom cylinder hose at the fitting.",
    component: "Boom hydraulics",
    severity: "high",
    severityReason: "Active hydraulic leak on the boom under load.",
    safeToOperate: false,
  },
  photoObservations: ["Oil running down the hose below the crimped fitting"],
  repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
  workOrder: {
    title: "Replace boom cylinder hose",
    priority: "immediate",
    tasks: ["Isolate the machine", "Replace the hose", "Test under load"],
    parts: ["Hydraulic hose assembly, boom cylinder"],
    estimatedHours: 2,
    takeOutOfService: true,
  },
  confidence: "high",
  clarifyingQuestion: null,
};

function respond(draft: Partial<TriageResponse["draft"]>): TriageResponse {
  return {
    draft: { ...base, ...draft },
    model: "anthropic/claude-sonnet-5.5",
    durationMs: 8100,
    filled: [],
  };
}

async function draftForExcavator(page: Page, notes: string) {
  await page.goto("/asset/EX-014");
  await expect(page.getByLabel("Add photos")).toBeEnabled();
  await page.getByRole("textbox", { name: "Notes" }).fill(notes);
  await page.getByRole("button", { name: "Draft with AI" }).click();
}

test("the excavator hose leak is flagged as a repeat, linked to and highlighting the seeded entries", async ({
  page,
}) => {
  await page.route("**/api/triage", (route) =>
    route.fulfill({
      json: respond({
        repeat: {
          isRepeat: true,
          relatedHistoryIds: ["EX-014-H1", "EX-014-H4"],
          summary: "Third leak at the same boom hose fitting since March.",
        },
      }),
    }),
  );
  await draftForExcavator(page, "Oil dripping from the boom hose again");

  const findings = page.getByRole("region", { name: "AI findings" });
  await expect(findings).toContainText("Repeats earlier history");
  const related = findings.getByRole("list", { name: "Related history" });
  await expect(related.getByRole("link")).toHaveText([
    "Hydraulic oil weeping at boom cylinder hose",
    "Hose leak at boom fitting, second occurrence",
  ]);

  const history = page.getByRole("list", { name: "History" });
  const marked = history.getByRole("listitem").filter({ hasText: "Linked by the AI repeat check" });
  await expect(marked).toHaveCount(2);
  await expect(marked.first()).toContainText("Hose leak at boom fitting, second occurrence");

  // The link takes the reviewer to the entry in the history column.
  await related.getByRole("link", { name: "Hydraulic oil weeping at boom cylinder hose" }).click();
  await expect(page).toHaveURL(/#history-EX-014-H1$/);
  await expect(page.locator("#history-EX-014-H1")).toBeInViewport();

  // Leaving the draft clears the highlight.
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(marked).toHaveCount(0);
});

test("an unclear report gets a question; the answer is sent back and the draft re-runs", async ({
  page,
}) => {
  const bodies: string[] = [];
  await page.route("**/api/triage", async (route) => {
    bodies.push(route.request().postDataBuffer()?.toString() ?? "");
    await route.fulfill({
      json:
        bodies.length === 1
          ? respond({
              confidence: "low",
              photoObservations: ["The photo is too blurred to make out a hose or fitting"],
              clarifyingQuestion: "Where on the machine is the oil coming from?",
            })
          : respond({}),
    });
  });
  await page.goto("/asset/EX-014");
  await expect(page.getByLabel("Add photos")).toBeEnabled();
  await page.getByLabel("Add photos").setInputFiles("demo-files/photos/excavator-unclear.jpg");
  await expect(page.getByRole("img", { name: /Photo 1/ })).toBeVisible();
  await page.getByRole("textbox", { name: "Notes" }).fill("Oil leak");
  await page.getByRole("button", { name: "Draft with AI" }).click();

  const question = page.getByRole("form", { name: "The AI has a question" });
  await expect(question).toContainText("Where on the machine is the oil coming from?");
  await expect(page.getByRole("region", { name: "AI findings" })).toContainText(
    "Confidence: Low",
  );
  await question.getByRole("textbox", { name: "Your answer" }).fill("The boom cylinder hose");
  await question.getByRole("button", { name: "Answer and draft again" }).click();

  await expect(question).toHaveCount(0);
  await expect(page.getByRole("region", { name: "AI findings" })).toContainText(
    "Confidence: High",
  );
  await expect(
    page
      .getByRole("form", { name: "Issue and work order" })
      .getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Hydraulic hose leak at boom fitting");
  await expect(page.getByText("Answer: The boom cylinder hose")).toBeVisible();

  // The re-run sent the same notes and photo, with the question and answer.
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toContain("Oil leak");
  expect(bodies[1]).toContain('name="photos"');
  expect(bodies[1]).toContain("Where on the machine is the oil coming from?");
  expect(bodies[1]).toContain("The boom cylinder hose");
});
