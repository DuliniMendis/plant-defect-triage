import { expect, test } from "vitest";
import { seedAssets } from "../../db/seed-data";
import {
  newRunTag,
  seededAt,
  shouldRemove,
  STALE_AFTER_MS,
  tempAssetId,
  tempAssets,
} from "./temp-assets";

const now = Date.UTC(2026, 10, 11, 9, 0, 0);

test("a run tag records when the run was seeded", () => {
  const tag = newRunTag(now);
  expect(tag).toMatch(/^[0-9A-Z]+-[0-9A-Z]+$/);
  expect(seededAt(tempAssetId(tag, "WO-D"))).toBe(now);
});

test("clean-up removes this run's assets and those of dead runs, and nothing else", () => {
  const mine = newRunTag(now);
  const other = newRunTag(now - 60_000);
  const dead = newRunTag(now - STALE_AFTER_MS - 1);
  const remove = (id: string) => shouldRemove(id, { tag: mine, now });

  expect(remove(tempAssetId(mine, "AI-T"))).toBe(true);
  expect(remove(tempAssetId(dead, "WO-D"))).toBe(true);
  // Another run going on at the same time keeps its assets.
  expect(remove(tempAssetId(other, "WO-D"))).toBe(false);
  // Never a demo asset, and never an E2E- ID this code did not make.
  expect(remove("EX-014")).toBe(false);
  expect(remove("E2E-manual")).toBe(false);
  // With no run recorded, only dead runs are removed.
  expect(shouldRemove(tempAssetId(other, "WO-D"), { tag: null, now })).toBe(false);
  expect(shouldRemove(tempAssetId(dead, "WO-D"), { tag: null, now })).toBe(true);
});

test("temporary assets never share an ID with the demo fleet", () => {
  const seeded = new Set(seedAssets.map((a) => a.id));
  const ids = tempAssets(newRunTag(now)).map((a) => a.id);
  expect(new Set(ids).size).toBe(5);
  expect(ids.some((id) => seeded.has(id))).toBe(false);
});
