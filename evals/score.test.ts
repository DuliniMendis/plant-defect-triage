import { describe, expect, it } from "vitest";
import { blankDraft, type TriageDraft } from "@/lib/schema";
import { scoreDraft } from "./score";

function draft(change: (d: TriageDraft) => void): TriageDraft {
  const d = blankDraft();
  d.confidence = "medium";
  change(d);
  return d;
}

const byName = (s: ReturnType<typeof scoreDraft>, name: string) =>
  s.checks.find((c) => c.name === name);

describe("scoreDraft", () => {
  it("passes a draft that meets every expectation", () => {
    const d = draft((d) => {
      d.issue.severity = "high";
      d.issue.safeToOperate = false;
      d.issue.component = "Boom hydraulics";
      d.repeat = { isRepeat: true, relatedHistoryIds: ["EX-014-H4"], summary: "" };
      d.photoObservations = ["Wet hose"];
    });
    const score = scoreDraft(
      d,
      {
        severity: ["high", "critical"],
        safeToOperate: false,
        repeat: { anyOf: ["EX-014-H4", "EX-014-H1"] },
        clarifyingQuestion: false,
        component: "Boom hydraulics",
      },
      { photoCount: 1 },
    );
    expect(score.pass).toBe(true);
    expect(score.underRated).toBe(false);
    expect(score.checks.map((c) => c.name)).toEqual([
      "severity",
      "safeToOperate",
      "repeat",
      "clarifyingQuestion",
      "component",
    ]);
  });

  it("flags a severity below the allowed range as under-rated", () => {
    const score = scoreDraft(
      draft((d) => (d.issue.severity = "medium")),
      { severity: ["high", "critical"] },
      { photoCount: 1 },
    );
    expect(score.pass).toBe(false);
    expect(score.underRated).toBe(true);
  });

  it("fails but does not flag a severity above the allowed range", () => {
    const score = scoreDraft(
      draft((d) => (d.issue.severity = "critical")),
      { severity: ["low", "medium"] },
      { photoCount: 0 },
    );
    expect(byName(score, "severity")?.pass).toBe(false);
    expect(score.underRated).toBe(false);
  });

  it("needs every allOf ID and one anyOf ID for a repeat", () => {
    const expectRepeat = { repeat: { allOf: ["A"], anyOf: ["B", "C"] } } as const;
    const linked = (ids: string[]) =>
      scoreDraft(
        draft((d) => (d.repeat = { isRepeat: true, relatedHistoryIds: ids, summary: "" })),
        expectRepeat,
        { photoCount: 1 },
      ).pass;
    expect(linked(["A", "C"])).toBe(true);
    expect(linked(["A"])).toBe(false);
    expect(linked(["B"])).toBe(false);
  });

  it("fails a repeat claim when none is expected", () => {
    const score = scoreDraft(
      draft((d) => (d.repeat = { isRepeat: true, relatedHistoryIds: ["X"], summary: "" })),
      { repeat: false },
      { photoCount: 1 },
    );
    expect(byName(score, "repeat")).toMatchObject({ pass: false, actual: "repeat [X]" });
  });

  it("treats a blank clarifying question as no question", () => {
    const score = scoreDraft(
      draft((d) => (d.clarifyingQuestion = "  ")),
      { clarifyingQuestion: true },
      { photoCount: 1 },
    );
    expect(byName(score, "clarifyingQuestion")?.pass).toBe(false);
  });

  it("checks there are no photo observations when there are no photos", () => {
    const score = scoreDraft(
      draft((d) => (d.photoObservations = ["Looks fine"])),
      {},
      { photoCount: 0 },
    );
    expect(byName(score, "photoObservations")?.pass).toBe(false);
    expect(scoreDraft(blankDraft(), {}, { photoCount: 2 }).checks).toEqual([]);
  });
});
