import { expect, test, type Page } from "@playwright/test";
import { seedAssets } from "../db/seed-data";

// Needs a seeded database (`pnpm db:seed`). Runs at desktop and 768px widths.
const total = seedAssets.length;
const pageSize = 8;

const cards = (page: Page) =>
  page.getByRole("list", { name: "Assets" }).getByRole("listitem");
const pager = (page: Page) => page.getByRole("navigation", { name: "Pagination" });

test("the fleet page lists every seeded asset from the database, a page at a time", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fleet", level: 1 })).toBeVisible();

  const sorted = seedAssets.map((a) => a.id).sort();
  const seen: string[] = [];
  const pageCount = Math.ceil(total / pageSize);

  for (let n = 1; n <= pageCount; n++) {
    if (n > 1) await pager(page).getByRole("button", { name: `Page ${n}` }).click();
    await expect(cards(page)).toHaveCount(Math.min(pageSize, total - (n - 1) * pageSize));
    for (const text of await cards(page).getByRole("link").allInnerTexts()) {
      seen.push(text.split(/\s/)[0]);
    }
  }
  expect(seen).toEqual(sorted);
});

test("each card shows the asset's ID, name, site and status", async ({ page }) => {
  await page.goto("/?q=EX-014");
  const card = cards(page).getByRole("link");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("EX-014");
  await expect(card).toContainText("20t Excavator");
  await expect(card).toContainText("Caterpillar 320");
  await expect(card).toContainText("Riverside Quarry");
  await expect(card).toContainText("Operational");
});

test("picking an asset from the list opens its profile", async ({ page }) => {
  await page.goto("/?q=excavator");
  await page.getByRole("link", { name: /20t Excavator/ }).click();
  await expect(page).toHaveURL("/asset/EX-014");
  await expect(page.getByRole("main")).toContainText("EX-014");
});

test("search, filters and page survive opening an asset and going back", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(pageSize);

  await page.getByRole("combobox", { name: "Site" }).selectOption("Westlink Civil Site");
  await page.getByRole("combobox", { name: "Status" }).selectOption("Operational");
  await page.getByRole("searchbox", { name: "Search" }).fill("jcb");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("TH-007");
  await expect(page).toHaveURL(/\?q=jcb&site=Westlink\+Civil\+Site&status=operational$/);

  await cards(page).first().getByRole("link").click();
  await expect(page).toHaveURL("/asset/TH-007");
  await page.goBack();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("jcb");
  await expect(cards(page)).toHaveCount(1);

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(cards(page)).toHaveCount(pageSize);

  await pager(page).getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\?page=2$/);
  await expect(page.getByRole("status")).toContainText(`Showing 9–16 of ${total} assets`);
  await page.reload();
  await expect(page.getByRole("status")).toContainText(`Showing 9–16 of ${total} assets`);
});

test("a filter with no matches says so", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search" }).fill("no such asset");
  await expect(page.getByText("No assets match these filters.")).toBeVisible();
  await expect(pager(page)).toHaveCount(0);
});

test("the fleet layout has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Assets" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
