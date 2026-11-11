import { describe, expect, test } from "vitest";
import { seedAssets, seedHistory } from "./seed-data";

describe("seed data", () => {
  test("has the four demo assets, one of each kind", () => {
    expect(seedAssets.map((a) => a.category)).toEqual([
      "Excavator",
      "Telehandler",
      "Light vehicle",
      "Generator",
    ]);
  });

  test("asset and history IDs are unique", () => {
    const assetIds = seedAssets.map((a) => a.id);
    const historyIds = seedHistory.map((h) => h.id);
    expect(new Set(assetIds).size).toBe(assetIds.length);
    expect(new Set(historyIds).size).toBe(historyIds.length);
  });

  test("every history entry belongs to a seeded asset and is marked seeded", () => {
    const assetIds = new Set(seedAssets.map((a) => a.id));
    for (const h of seedHistory) {
      expect(assetIds).toContain(h.assetId);
      expect(h.seeded).toBe(true);
    }
  });

  test("history meter readings do not exceed the asset's current reading", () => {
    const meter = new Map(seedAssets.map((a) => [a.id, a.meterHours]));
    for (const h of seedHistory) {
      if (h.meterHours != null) {
        expect(h.meterHours).toBeLessThanOrEqual(meter.get(h.assetId)!);
      }
    }
  });

  test("the excavator has two earlier boom hose repairs to set up a repeat", () => {
    const boomRepairs = seedHistory.filter(
      (h) =>
        h.assetId === "EX-014" &&
        h.kind === "repair" &&
        h.component === "Boom hydraulics",
    );
    expect(boomRepairs).toHaveLength(2);
  });
});
