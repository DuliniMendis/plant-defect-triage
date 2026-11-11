import { severities, type Severity, type TriageDraft } from "@/lib/schema";
import type { Expectations } from "./cases";

// Scores one draft against a case's expectations. Pure, so it is unit tested
// without calling a model.

export const checkNames = [
  "severity",
  "safeToOperate",
  "repeat",
  "clarifyingQuestion",
  "confidence",
  "component",
  "photoObservations",
] as const;
export type CheckName = (typeof checkNames)[number];

export type Check = {
  name: CheckName;
  pass: boolean;
  expected: string;
  actual: string;
};

export type Score = {
  checks: Check[];
  pass: boolean;
  /**
   * The severity was below every allowed value. The costly error (technical
   * plan v2, section 3), so it is counted on its own.
   */
  underRated: boolean;
};

const rank = (s: Severity) => severities.indexOf(s);

export function scoreDraft(
  draft: TriageDraft,
  expect: Expectations,
  { photoCount }: { photoCount: number },
): Score {
  const checks: Check[] = [];
  let underRated = false;

  if (expect.severity) {
    const actual = draft.issue.severity;
    const lowest = Math.min(...expect.severity.map(rank));
    underRated = rank(actual) < lowest;
    checks.push({
      name: "severity",
      pass: expect.severity.includes(actual),
      expected: expect.severity.join(" or "),
      actual,
    });
  }

  if (expect.safeToOperate !== undefined) {
    checks.push({
      name: "safeToOperate",
      pass: draft.issue.safeToOperate === expect.safeToOperate,
      expected: String(expect.safeToOperate),
      actual: String(draft.issue.safeToOperate),
    });
  }

  if (expect.repeat !== undefined) {
    const { isRepeat, relatedHistoryIds: ids } = draft.repeat;
    const actual = isRepeat ? `repeat [${ids.join(", ")}]` : "not a repeat";
    if (expect.repeat === false) {
      checks.push({ name: "repeat", pass: !isRepeat, expected: "not a repeat", actual });
    } else {
      const { allOf = [], anyOf = [] } = expect.repeat;
      const pass =
        isRepeat &&
        allOf.every((id) => ids.includes(id)) &&
        (anyOf.length === 0 || anyOf.some((id) => ids.includes(id)));
      const wanted = [
        allOf.length ? `all of ${allOf.join(", ")}` : null,
        anyOf.length ? `any of ${anyOf.join(", ")}` : null,
      ].filter(Boolean);
      checks.push({
        name: "repeat",
        pass,
        expected: `repeat, linking ${wanted.join(" and ") || "any entry"}`,
        actual,
      });
    }
  }

  if (expect.clarifyingQuestion !== undefined) {
    const asked = draft.clarifyingQuestion !== null && draft.clarifyingQuestion.trim() !== "";
    checks.push({
      name: "clarifyingQuestion",
      pass: asked === expect.clarifyingQuestion,
      expected: expect.clarifyingQuestion ? "asks a question" : "no question",
      actual: asked ? `asks: ${draft.clarifyingQuestion}` : "no question",
    });
  }

  if (expect.confidence) {
    checks.push({
      name: "confidence",
      pass: expect.confidence.includes(draft.confidence),
      expected: expect.confidence.join(" or "),
      actual: draft.confidence,
    });
  }

  if (expect.component !== undefined) {
    checks.push({
      name: "component",
      pass: draft.issue.component === expect.component,
      expected: expect.component,
      actual: draft.issue.component,
    });
  }

  // Rule 2 of the system prompt: no photos, no photo observations.
  if (photoCount === 0) {
    checks.push({
      name: "photoObservations",
      pass: draft.photoObservations.length === 0,
      expected: "none (no photos)",
      actual: `${draft.photoObservations.length} observation(s)`,
    });
  }

  return { checks, pass: checks.every((c) => c.pass), underRated };
}
