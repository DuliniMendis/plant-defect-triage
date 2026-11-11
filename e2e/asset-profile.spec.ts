import { expect, test } from "@playwright/test";

// Asset profile (milestone 2, R5 and R6). These read seeded assets from the
// database, so they are skipped until DATABASE_URL is set (milestone 1 connects
// Neon and adds the seed script). EX-014 is the seeded excavator.
test.skip(
  !process.env.DATABASE_URL,
  "DATABASE_URL is not set; run `vercel env pull .env.local` and `pnpm db:seed`",
);

test("shows an asset's key facts and its history, newest first", async ({
  page,
}) => {
  await page.goto("/asset/EX-014");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const facts = page.getByRole("region", { name: "Key facts" });
  for (const term of [
    "Make",
    "Model",
    "Site",
    "Meter hours",
    "Next service due",
    "Status",
  ]) {
    await expect(facts.getByText(term, { exact: true })).toBeVisible();
  }

  const history = page.getByRole("list", { name: "History" });
  await expect(history.getByRole("listitem").first()).toBeVisible();
  const dates = await history
    .locator("time")
    .evaluateAll((times) => times.map((t) => t.getAttribute("datetime") ?? ""));
  expect(dates.length).toBeGreaterThan(0);
  expect(dates).toEqual([...dates].sort().reverse());
});

test("offers the Report a defect entry point", async ({ page }) => {
  await page.goto("/asset/EX-014");
  await expect(
    page.getByRole("region", { name: "Report a defect" }),
  ).toBeVisible();
});

test("puts defect capture beside the history on desktop and above it at tablet width", async ({
  page,
}) => {
  await page.goto("/asset/EX-014");
  const facts = await page
    .getByRole("region", { name: "Key facts" })
    .boundingBox();
  const report = await page
    .getByRole("region", { name: "Report a defect" })
    .boundingBox();
  expect(facts && report).toBeTruthy();

  const width = page.viewportSize()?.width ?? 0;
  if (width >= 1024) {
    expect(report!.x).toBeGreaterThan(facts!.x + facts!.width - 1);
  } else {
    expect(report!.x).toBe(facts!.x);
    expect(report!.y + report!.height).toBeLessThanOrEqual(facts!.y);
  }
});

test("shows a not-found message for an unknown asset", async ({ page }) => {
  await page.goto("/asset/NO-SUCH-ASSET");
  await expect(
    page.getByRole("heading", { name: "Asset not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to the fleet" }),
  ).toHaveAttribute("href", "/");
});
