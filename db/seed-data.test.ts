import { describe, expect, test } from "vitest";
import { seedAssets, seedHistory } from "./seed-data";

describe("seed data", () => {
  test("starts with the four demo assets that have sample photos", () => {
    expect(seedAssets.slice(0, 4).map((a) => a.id)).toEqual([
      "EX-014",
      "TH-007",
      "LV-022",
      "GN-003",
    ]);
  });

  test("has enough assets for three pages of the fleet list", () => {
    expect(seedAssets.length).toBeGreaterThan(16);
  });

  test("every asset that is not operational has an open issue explaining why", () => {
    for (const asset of seedAssets.filter((a) => a.status !== "operational")) {
      const open = seedHistory.filter(
        (h) => h.assetId === asset.id && h.kind === "issue" && h.status === "open",
      );
      expect(open, asset.id).not.toHaveLength(0);
    }
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
