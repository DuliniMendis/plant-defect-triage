import { expect, test, type Page } from "@playwright/test";
import { seedAssets, seedHistory } from "../db/seed-data";

// Asset profile (milestone 2, R5 and R6). Needs a seeded database
// (`pnpm db:seed`). Runs at desktop and 768px widths.

const historyDates = (page: Page) =>
  page
    .getByRole("list", { name: "History" })
    .locator("time")
    .evaluateAll((times) => times.map((t) => t.getAttribute("datetime") ?? ""));

// The milestone's "done when": every seeded asset opens from the fleet page
// with its full history in order. One test per asset, so they run in parallel
// and a failure names the asset.
for (const asset of seedAssets) {
  test(`${asset.id} opens from the fleet page with its full history, newest first`, async ({
    page,
  }) => {
    await page.goto(`/?q=${asset.id}`);
    await page
      .getByRole("table", { name: "Assets" })
      .getByRole("link", { name: asset.name })
      .click();
    await expect(page).toHaveURL(`/asset/${asset.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      asset.id,
    );

    const expected = seedHistory
      .filter((entry) => entry.assetId === asset.id)
      .map((entry) => entry.date);
    await expect(
      page.getByRole("list", { name: "History" }).getByRole("listitem"),
    ).toHaveCount(expected.length);
    expect(await historyDates(page)).toEqual(expected.toSorted().reverse());
  });
}

test("shows an asset's key facts", async ({ page }) => {
  await page.goto("/asset/EX-014");

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
  await expect(facts).toContainText("Caterpillar");
  await expect(facts).toContainText("Riverside Quarry");
  await expect(facts).toContainText("At 7,000 h (158 h to go)");
  await expect(
    facts.getByRole("meter", { name: "Hours left before the next service" }),
  ).toHaveAttribute("aria-valuenow", "158");
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

test("the profile has no horizontal scroll", async ({ page }) => {
  await page.goto("/asset/EX-014");
  await expect(page.getByRole("region", { name: "Key facts" })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
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
