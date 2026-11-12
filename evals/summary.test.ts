import { describe, expect, it } from "vitest";
import { median, summarise, type RunResult } from "./summary";

const result = (r: Partial<RunResult> & Pick<RunResult, "model">): RunResult => ({
  caseId: "c",
  run: 1,
  durationMs: 1000,
  ...r,
});

describe("summarise", () => {
  it("totals passes, errors, under-rated drafts and checks per model", () => {
    const sev = (pass: boolean) => ({ name: "severity" as const, pass, expected: "", actual: "" });
    const summaries = summarise([
      result({ model: "a", durationMs: 2000, score: { pass: true, underRated: false, checks: [sev(true)] } }),
      result({ model: "a", durationMs: 4000, score: { pass: false, underRated: true, checks: [sev(false)] } }),
      result({ model: "a", durationMs: 90_000, error: "timeout" }),
      result({ model: "b", durationMs: 1000, score: { pass: true, underRated: false, checks: [] } }),
    ]);

    expect(summaries).toEqual([
      {
        model: "a",
        runs: 3,
        passed: 1,
        errors: 1,
        underRated: 1,
        checks: { severity: { passed: 1, total: 2 } },
        medianMs: 3000,
        maxMs: 4000,
      },
      { model: "b", runs: 1, passed: 1, errors: 0, underRated: 0, checks: {}, medianMs: 1000, maxMs: 1000 },
    ]);
  });
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBe(0);
  });
});
