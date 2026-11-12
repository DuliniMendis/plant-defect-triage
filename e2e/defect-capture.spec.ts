import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

// Defect capture (R7, R9, R10, R11; notes required, photos optional) on the asset profile, with the sample
// photos from demo-files. Needs a seeded database (`pnpm db:seed`).
const photo = (name: string) =>
  path.join(__dirname, "..", "demo-files", "photos", name);

test.beforeEach(async ({ page }) => {
  await page.goto("/asset/EX-014");
  // Controls are enabled once the panel has hydrated.
  await expect(page.getByLabel("Add photos")).toBeEnabled();
});

// Next.js adds its own role="alert" route announcer, so look inside the panel.
const panel = (page: Page) =>
  page.getByRole("region", { name: "Report a defect" });

test("needs notes before continuing", async ({ page }) => {
  await page.getByRole("button", { name: "Fill in by hand" }).click();
  await expect(panel(page).getByRole("alert")).toHaveText(
    "Type some notes about the defect before continuing.",
  );

  await page.getByRole("textbox", { name: "Notes" }).fill("Oil under the boom");
  await expect(panel(page).getByRole("alert")).toBeHidden();
  await page.getByRole("button", { name: "Fill in by hand" }).click();
  await expect(page.getByRole("form", { name: "Issue and work order" })).toBeVisible();
  await expect(page.getByText("Oil under the boom")).toBeVisible();
});

test("adds, previews, resizes and removes sample photos", async ({ page }) => {
  await page
    .getByLabel("Add photos")
    .setInputFiles([
      photo("excavator-hose-leak.jpg"),
      photo("generator-battery-corrosion.jpg"),
    ]);

  const first = page.getByRole("img", { name: "Photo 1: excavator-hose-leak.jpg" });
  const second = page.getByRole("img", {
    name: "Photo 2: generator-battery-corrosion.jpg",
  });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();

  // 1456 × 1088 is under the 1,500px limit and keeps its size; the preview has
  // decoded, so the photo was read and re-encoded in the browser.
  const size = await first.evaluate((img: HTMLImageElement) => [
    img.naturalWidth,
    img.naturalHeight,
  ]);
  expect(size).toEqual([1456, 1088]);

  await page
    .getByRole("button", { name: "Remove photo 1, excavator-hose-leak.jpg" })
    .click();
  await expect(first).toBeHidden();
  await expect(
    page.getByRole("img", { name: "Photo 1: generator-battery-corrosion.jpg" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Fill in by hand" }).click();
  await expect(panel(page).getByRole("alert")).toBeVisible();
  await page.getByRole("textbox", { name: "Notes" }).fill("Battery terminal corroded");
  await page.getByRole("button", { name: "Fill in by hand" }).click();
  await expect(
    page.getByRole("list", { name: "Report photos" }).getByRole("img"),
  ).toHaveCount(1);
});

test("stops at 3 photos", async ({ page }) => {
  await page
    .getByLabel("Add photos")
    .setInputFiles([
      photo("excavator-hose-leak.jpg"),
      photo("telehandler-tyre-cut.jpg"),
      photo("ute-cracked-windscreen.jpg"),
      photo("generator-battery-corrosion.jpg"),
    ]);

  await expect(page.getByRole("list", { name: "Added photos" }).getByRole("listitem")).toHaveCount(3);
  await expect(
    page.getByText(
      "You can add up to 3 photos, so generator-battery-corrosion.jpg was not added.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Add photos")).toBeDisabled();
});

test("resizes a large photo to 1,500px on the longest side", async ({ page }) => {
  // Draw a 3000 × 2000 image in the page and hand it back as a PNG file.
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 2000;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffcc00";
    context.fillRect(0, 0, 3000, 2000);
    return canvas.toDataURL("image/png").split(",")[1];
  });

  await page.getByLabel("Add photos").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  });

  const preview = page.getByRole("img", { name: "Photo 1: large.png" });
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((img: HTMLImageElement) => [
        img.naturalWidth,
        img.naturalHeight,
      ]),
    )
    .toEqual([1500, 1000]);
});
