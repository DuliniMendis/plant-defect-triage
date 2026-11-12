import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { caseKinds, triageCases } from "./cases";
import { PHOTO_DIR, seededAsset, seededHistory } from "./fixtures";

// The cases must stay true to the seed data, or an eval failure would say more
// about the case than the model.

describe("triage eval cases", () => {
  it("have unique IDs", () => {
    const ids = triageCases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cover every kind of case", () => {
    expect(new Set(triageCases.map((c) => c.kind))).toEqual(new Set(caseKinds));
  });

  it.each(triageCases)("$id points at real seed data and photos", (c) => {
    expect(() => seededAsset(c.assetId)).not.toThrow();
    const history = seededHistory(c.assetId);
    const ids = history.map((h) => h.id);

    if (c.expect.repeat) {
      for (const id of [...(c.expect.repeat.allOf ?? []), ...(c.expect.repeat.anyOf ?? [])]) {
        expect(ids).toContain(id);
      }
    }
    if (c.expect.component) {
      expect(history.map((h) => h.component)).toContain(c.expect.component);
    }
    expect(c.photos.length).toBeLessThanOrEqual(3);
    for (const photo of c.photos) {
      expect(existsSync(path.join(PHOTO_DIR, photo.file))).toBe(true);
    }
    if (c.kind === "repeat") expect(c.expect.repeat).toBeTruthy();
    if (c.kind === "unclear" || c.kind === "contradicting") {
      expect(c.expect.clarifyingQuestion).toBe(true);
    }
  });
});

describe("seededHistory", () => {
  it("is newest first, like the database query", () => {
    const dates = seededHistory("EX-014").map((h) => h.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates).toHaveLength(6);
  });
});
