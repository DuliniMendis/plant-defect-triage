import { expect, test } from "@playwright/test";

// Needs a seeded database (`pnpm db:seed`). Runs at desktop and 768px widths.
const fleet = [
  { id: "EX-014", name: "20t Excavator", site: "Riverside Quarry", status: "Operational" },
  { id: "GN-003", name: "60 kVA Generator", site: "Westlink Civil Site", status: "Needs attention" },
  { id: "LV-022", name: "Dual-cab Ute", site: "Harbour Road Depot", status: "Operational" },
  { id: "TH-007", name: "Telehandler", site: "Westlink Civil Site", status: "Operational" },
];

test("the fleet page lists every seeded asset from the database", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fleet", level: 1 })).toBeVisible();

  const items = page.getByRole("list", { name: "Assets" }).getByRole("listitem");
  await expect(items).toHaveCount(fleet.length);

  for (const [i, asset] of fleet.entries()) {
    const card = items.nth(i).getByRole("link");
    await expect(card).toBeVisible();
    await expect(card).toContainText(asset.id);
    await expect(card).toContainText(asset.name);
    await expect(card).toContainText(asset.site);
    await expect(card).toContainText(asset.status);
  }
});

test("picking an asset from the list opens its profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /20t Excavator/ }).click();
  await expect(page).toHaveURL("/asset/EX-014");
  await expect(page.getByRole("main")).toContainText("EX-014");
});

test("the fleet layout has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Assets" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
