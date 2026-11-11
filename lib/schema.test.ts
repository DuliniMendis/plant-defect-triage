import { describe, expect, test } from "vitest";
import { triageDraftSchema, type TriageDraft } from "./schema";

const validDraft: TriageDraft = {
  issue: {
    title: "Hydraulic hose leak at boom fitting",
    description: "Oil weeping from the boom cylinder hose fitting.",
    component: "Boom hydraulics",
    severity: "high",
    severityReason: "Hydraulics under load can fail suddenly.",
    safeToOperate: false,
  },
  photoObservations: ["Wet oil film around the fitting"],
  repeat: { isRepeat: false, relatedHistoryIds: [], summary: "" },
  workOrder: {
    title: "Replace boom hose",
    priority: "urgent",
    tasks: ["Isolate hydraulics", "Replace hose"],
    parts: ["Hydraulic hose"],
    estimatedHours: 2.5,
    takeOutOfService: true,
  },
  confidence: "high",
  clarifyingQuestion: null,
};

describe("triageDraftSchema", () => {
  test("accepts a complete draft", () => {
    expect(triageDraftSchema.safeParse(validDraft).success).toBe(true);
  });

  test("rejects an unknown severity", () => {
    const draft = {
      ...validDraft,
      issue: { ...validDraft.issue, severity: "severe" },
    };
    expect(triageDraftSchema.safeParse(draft).success).toBe(false);
  });

  test("rejects negative estimated hours", () => {
    const draft = {
      ...validDraft,
      workOrder: { ...validDraft.workOrder, estimatedHours: -1 },
    };
    expect(triageDraftSchema.safeParse(draft).success).toBe(false);
  });
});
