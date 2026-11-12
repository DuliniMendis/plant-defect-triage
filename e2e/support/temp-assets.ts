import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Temporary assets for end-to-end tests that write data.
//
// The write specs save work orders, which changes an asset's history and
// status. Rather than borrowing seeded assets, each test run adds its own
// assets before the tests (`pnpm e2e:seed`) and removes them afterwards
// (`pnpm e2e:clean`), so the demo fleet is never touched, even when a run
// fails part way.
//
// Every temporary asset ID is `E2E-<run tag>-<slot>`. The run tag starts with
// the time the run was seeded, so a clean-up can also remove what a killed
// run left behind, and two runs at once never remove each other's assets.

export const TEMP_PREFIX = "E2E-";

/** Temporary assets older than this are left over from a run that died. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * One temporary asset per write spec and browser project, and one with a
 * known history for the read-only specs (HIST), so they do not depend on the
 * state of the shared demo fleet.
 */
export const tempSlots = ["WO-D", "WO-T", "AI-D", "AI-T", "DEL-D", "DEL-T", "HIST", "INS"] as const;
export type TempSlot = (typeof tempSlots)[number];

/** Where `pnpm e2e:seed` records the current run's tag for the tests and clean-up. */
export const RUN_FILE = path.join(__dirname, "..", ".temp-run.json");

export function newRunTag(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 6);
  return `${now.toString(36)}-${random}`.toUpperCase();
}

export function tempAssetId(tag: string, slot: TempSlot): string {
  return `${TEMP_PREFIX}${tag}-${slot}`;
}

/** When the run that made this temporary asset was seeded, or null if not a temp ID. */
export function seededAt(assetId: string): number | null {
  const match = /^E2E-([0-9A-Z]+)-[0-9A-Z]+-/.exec(assetId);
  if (!match) return null;
  const time = parseInt(match[1], 36);
  return Number.isFinite(time) ? time : null;
}

/** Temporary assets to remove: this run's, plus any left by a run that died. */
export function shouldRemove(
  assetId: string,
  { tag, now = Date.now() }: { tag: string | null; now?: number },
): boolean {
  if (!assetId.startsWith(TEMP_PREFIX)) return false;
  if (tag && assetId.startsWith(`${TEMP_PREFIX}${tag}-`)) return true;
  const time = seededAt(assetId);
  // An E2E- ID that cannot be read was not made by this code; leave it.
  return time !== null && now - time > STALE_AFTER_MS;
}

/**
 * The asset rows for one run: plain, operational assets. Like the filler
 * assets in the demo fleet, each has one earlier service in its history, so
 * the page shows a history list.
 */
export function tempAssets(tag: string) {
  return tempSlots.map((slot) => ({
    id: tempAssetId(tag, slot),
    name: slot === "HIST" ? "E2E history asset" : `E2E test asset ${slot}`,
    make: "Test",
    model: "E2E",
    category: "Test asset",
    site: "E2E test site",
    meterHours: 1000,
    nextServiceDueHours: 1500,
    status: "operational" as const,
  }));
}

/** The current run's tag, as written by `pnpm e2e:seed`. */
export function currentRunTag(): string | null {
  if (!existsSync(RUN_FILE)) return null;
  const { tag } = JSON.parse(readFileSync(RUN_FILE, "utf8")) as { tag?: unknown };
  return typeof tag === "string" ? tag : null;
}

/** IDs of this run's temporary assets. Fails clearly when the run was not seeded. */
export function currentTempAssetIds(): string[] {
  const tag = currentRunTag();
  if (!tag) {
    throw new Error(
      "No temporary E2E assets. Run the tests with `pnpm test:e2e`, or `pnpm e2e:seed` first.",
    );
  }
  return tempSlots.map((slot) => tempAssetId(tag, slot));
}

/** The temporary asset a write spec uses in a browser project. */
export function tempAssetFor(spec: "WO" | "AI" | "DEL", project: string): string {
  const tag = currentRunTag();
  if (!tag) currentTempAssetIds(); // throws the explanation
  const slot = `${spec}-${project.startsWith("tablet") ? "T" : "D"}` as TempSlot;
  return tempAssetId(tag!, slot);
}

/**
 * History for the temporary assets. Each write-spec asset has one closed
 * service. The HIST asset has a mix of kinds, inserted out of date order, so a
 * test can check the page sorts it newest first.
 */
export function tempHistory(tag: string) {
  const service = (slot: TempSlot) => ({
    id: `${tempAssetId(tag, slot)}-H1`,
    assetId: tempAssetId(tag, slot),
    date: "2026-08-01",
    kind: "schedule-check" as const,
    title: "Scheduled service",
    detail: "Temporary asset for end-to-end tests.",
    meterHours: 950,
    status: "closed" as const,
  });
  const hist = tempAssetId(tag, "HIST");
  const entry = (n: number, e: Omit<ReturnType<typeof service>, "id" | "assetId" | "kind" | "status"> & {
    kind: "issue" | "repair" | "schedule-check";
    status: "open" | "closed";
  }) => ({ id: `${hist}-H${n}`, assetId: hist, ...e });
  return [
    ...tempSlots.filter((slot) => slot !== "HIST").map(service),
    entry(1, { date: "2026-05-21", kind: "repair", title: "Replaced drive belt", detail: "", meterHours: 820, status: "closed" }),
    entry(2, { date: "2026-11-02", kind: "issue", title: "Squeal from the engine bay", detail: "", meterHours: 990, status: "open" }),
    entry(3, { date: "2026-03-10", kind: "issue", title: "Belt slipping on start-up", detail: "", meterHours: 760, status: "closed" }),
    entry(4, { date: "2026-08-01", kind: "schedule-check", title: "Scheduled service", detail: "", meterHours: 950, status: "closed" }),
  ];
}

/** The Insights spec's temporary asset, which holds its AI runs. */
export function tempInsightsAsset(): string {
  const tag = currentRunTag();
  if (!tag) currentTempAssetIds(); // throws the explanation
  return tempAssetId(tag!, "INS");
}

/** The read-only specs' temporary asset, with its history. */
export function tempHistoryAsset() {
  const tag = currentRunTag();
  if (!tag) currentTempAssetIds(); // throws the explanation
  const id = tempAssetId(tag!, "HIST");
  return {
    id,
    name: "E2E history asset",
    history: tempHistory(tag!).filter((h) => h.assetId === id),
  };
}
