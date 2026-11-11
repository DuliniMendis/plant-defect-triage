import { describe, expect, test } from "vitest";
import { blankDraft } from "@/lib/schema";
import {
  blankValues,
  draftFromValues,
  lines,
  valuesFromDraft,
  type FormValues,
} from "./work-order-form";

const filled = (): FormValues => ({
  issueTitle: "  Hose leak at boom ",
  description: "Oil weeping from the fitting",
  component: "Boom hydraulics",
  severity: "high",
  severityReason: "Could burst under load",
  safeToOperate: "no",
  workOrderTitle: "Replace boom hose",
  priority: "urgent",
  tasks: "Isolate hydraulics\n\n  Replace hose  \n",
  parts: "Hydraulic hose",
  estimatedHours: "2.5",
  takeOutOfService: true,
});

describe("draftFromValues", () => {
  test("builds a trimmed draft from a filled form", () => {
    const result = draftFromValues(filled(), blankDraft());
    expect(result).toEqual({
      ok: true,
      draft: {
        ...blankDraft(),
        issue: {
          title: "Hose leak at boom",
          description: "Oil weeping from the fitting",
          component: "Boom hydraulics",
          severity: "high",
          severityReason: "Could burst under load",
          safeToOperate: false,
        },
        workOrder: {
          title: "Replace boom hose",
          priority: "urgent",
          tasks: ["Isolate hydraulics", "Replace hose"],
          parts: ["Hydraulic hose"],
          estimatedHours: 2.5,
          takeOutOfService: true,
        },
      },
    });
  });

  test("a blank form lists every required field", () => {
    const result = draftFromValues(blankValues(), blankDraft());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        [
          "issueTitle",
          "severity",
          "safeToOperate",
          "workOrderTitle",
          "priority",
          "tasks",
          "estimatedHours",
        ].sort(),
      );
    }
  });

  test.each(["", "abc", "-1"])("refuses %j as estimated hours", (hours) => {
    const result = draftFromValues({ ...filled(), estimatedHours: hours }, blankDraft());
    expect(result).toMatchObject({ ok: false, errors: { estimatedHours: expect.any(String) } });
  });

  test("keeps the fields the form does not show from the base draft", () => {
    const base = blankDraft();
    base.photoObservations = ["Wet film on the hose"];
    base.confidence = "medium";
    const result = draftFromValues(filled(), base);
    expect(result.ok && result.draft.photoObservations).toEqual(["Wet film on the hose"]);
    expect(result.ok && result.draft.confidence).toBe("medium");
  });
});

test("valuesFromDraft and draftFromValues round-trip", () => {
  const first = draftFromValues(filled(), blankDraft());
  if (!first.ok) throw new Error("expected a draft");
  expect(draftFromValues(valuesFromDraft(first.draft), blankDraft())).toEqual(first);
});

test("lines drops blank lines and trims", () => {
  expect(lines(" a \n\n b\n")).toEqual(["a", "b"]);
});
