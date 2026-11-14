import { expect, test, type Page } from "@playwright/test";

// The Test files page: the sample photos and saved QR codes offered for
// download, so the demo can be tried without the repository. Runs at desktop
// and 768px widths. The round trip needs a seeded database (`pnpm db:seed`).

async function download(page: Page, linkName: string) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: linkName, exact: true }).click(),
  ]);
  return file;
}

test("the header and the QR upload both lead to the test files", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Test files" })
    .click();
  await expect(page).toHaveURL("/test-files");
  await expect(page.getByRole("heading", { name: "Test files", level: 1 })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Download a test QR code" }).click();
  await expect(page).toHaveURL("/test-files");
});

test("a downloaded QR code opens its asset when uploaded on the fleet page", async ({ page }) => {
  await page.goto("/test-files");
  const file = await download(page, "Download TH-007 QR code");
  expect(file.suggestedFilename()).toBe("TH-007.png");

  await page.getByRole("link", { name: "Fleet", exact: true }).click();
  const input = page.getByLabel("Upload QR code");
  await expect(input).toBeEnabled();
  await input.setInputFiles(await file.path());
  await expect(page).toHaveURL("/asset/TH-007");
});

test("a sample photo downloads as a JPEG and shows on the page", async ({ page }) => {
  await page.goto("/test-files");
  const photos = page.getByRole("list", { name: "Sample defect photos" });
  await expect(photos.getByRole("listitem")).toHaveCount(5);

  // The thumbnail has loaded, not just been given a size.
  const thumbnail = photos.getByRole("img", { name: "Telehandler tyre cut" });
  await expect(thumbnail).toBeVisible();
  await expect
    .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  const file = await download(page, "Download Telehandler tyre cut photo");
  expect(file.suggestedFilename()).toBe("telehandler-tyre-cut.jpg");
  expect(await file.failure()).toBeNull();
});

test("each photo links to the asset it goes with", async ({ page }) => {
  await page.goto("/test-files");
  await page.getByRole("link", { name: "GN-003, 60 kVA Generator" }).click();
  await expect(page).toHaveURL("/asset/GN-003");
});
