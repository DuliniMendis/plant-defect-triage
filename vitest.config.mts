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
    // `.claude/` holds git worktrees for other branches, each with its own
    // node_modules. Playwright specs in e2e/ are `*.spec.ts` and not matched;
    // helpers in e2e/support/ can have unit tests.
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/*.spec.ts", ".claude/**"],
  },
});
