import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. Chrome only, at desktop and tablet widths (requirements v3,
// section 7).

// Load .env.local so tests can tell whether a database is configured, as the
// dev server does. A missing file is fine: database-backed tests skip.
try {
  process.loadEnvFile(".env.local");
} catch {}

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    {
      name: "tablet-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
