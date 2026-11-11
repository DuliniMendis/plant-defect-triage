import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit and component tests (Vitest + React Testing Library).
// Async Server Components are not supported by Vitest; cover those with
// Playwright in e2e/ instead.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
