import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { seedAssets } from "../db/seed-data";

// QR code lookup (R2) with the saved QR images (R3). Needs a seeded database
// (`pnpm db:seed`) and the images from `pnpm qr:generate`. Runs at desktop and
// 768px widths.
const demoFiles = path.join(__dirname, "..", "demo-files");
const qrFile = (id: string) => path.join(demoFiles, "qr", `${id}.png`);

// The upload is enabled once the page has hydrated.
async function uploadQr(page: Page, files: Parameters<Page["setInputFiles"]>[1]) {
  const input = page.getByLabel("Upload QR code");
  await expect(input).toBeEnabled();
  await input.setInputFiles(files);
}
// The QR error message. Next.js's route announcer is also an alert, so match
// the one that offers the list.
const qrAlert = (page: Page) =>
  page.getByRole("alert").filter({
    has: page.getByRole("button", { name: "Pick from the list" }),
  });
const rows = (page: Page) =>
  page
    .getByRole("table", { name: "Assets" })
    .getByRole("row")
    .filter({ has: page.getByRole("link") });

for (const asset of seedAssets) {
  test(`the saved QR code for ${asset.id} opens its profile`, async ({ page }) => {
    await page.goto("/");
    await uploadQr(page, qrFile(asset.id));
    await expect(page).toHaveURL(`/asset/${asset.id}`);
    await expect(page.getByRole("main")).toContainText(asset.id);
  });
}

test("a photo with no QR code says so and offers the list", async ({ page }) => {
  await page.goto("/?q=generator");
  await expect(rows(page)).not.toHaveCount(0);

  await uploadQr(page, path.join(demoFiles, "photos", "excavator-hose-leak.jpg"));
  const alert = qrAlert(page);
  await expect(alert).toContainText("No QR code found.");
  await expect(page).toHaveURL("/?q=generator");

  // Picking from the list shows every asset, with the search box ready.
  await alert.getByRole("button", { name: "Pick from the list" }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "Search" })).toBeFocused();
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  await expect(page).toHaveURL("/");
  await expect(rows(page)).toHaveCount(8);
});

test("a QR code for an unknown asset says so and offers the list", async ({ page }) => {
  await page.goto("/");
  await uploadQr(page, path.join(demoFiles, "qr-unknown-asset.png"));
  const alert = qrAlert(page);
  await expect(alert).toContainText("No matching asset.");
  await expect(alert).toContainText("The QR code reads ZZ-999");
  await expect(alert.getByRole("button", { name: "Pick from the list" })).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("a file that is not an image says so", async ({ page }) => {
  await page.goto("/");
  await uploadQr(page, {
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("EX-014"),
  });
  await expect(qrAlert(page)).toContainText("Not an image.");
});

test("another image can be tried after an error", async ({ page }) => {
  await page.goto("/");
  await uploadQr(page, path.join(demoFiles, "qr-unknown-asset.png"));
  await expect(qrAlert(page)).toContainText("No matching asset.");

  await uploadQr(page, qrFile("GN-003"));
  await expect(page).toHaveURL("/asset/GN-003");
});

test("the upload is ready again after going back from the opened asset", async ({ page }) => {
  await page.goto("/");
  await uploadQr(page, qrFile("EX-014"));
  await expect(page).toHaveURL("/asset/EX-014");

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Upload QR code", { exact: true })).toBeVisible();
  await uploadQr(page, qrFile("TH-007"));
  await expect(page).toHaveURL("/asset/TH-007");
});
