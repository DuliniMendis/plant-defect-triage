import { expect, test } from "@playwright/test";

test("every screen shows the app name and the disclaimer", async ({ page }) => {
  for (const path of ["/", "/asset/EX-014"]) {
    await page.goto(path);
    await expect(
      page.getByRole("link", { name: "Plant Defect Triage" }),
    ).toBeVisible();
    await expect(page.getByText("A concept for Gearbelt")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText(
      "Not a Sitemate product",
    );
  }
});
