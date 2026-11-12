import { spawnSync } from "node:child_process";

// `pnpm test:e2e [playwright args]`: seeds this run's temporary E2E assets,
// runs Playwright, and always removes the assets afterwards, whether the
// tests passed, failed or were interrupted. CI runs the same three steps as
// separate workflow steps (.github/workflows/ci.yml).

function run(args: string[]): number {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  return result.status ?? 1;
}

const seeded = run(["e2e:seed"]);
let status = seeded;
if (seeded === 0) {
  // Ctrl+C reaches Playwright too; wait for it to stop, then clean up.
  process.on("SIGINT", () => {});
  status = run(["exec", "playwright", "test", ...process.argv.slice(2)]);
}
const cleaned = run(["e2e:clean"]);
process.exit(status !== 0 ? status : cleaned);
