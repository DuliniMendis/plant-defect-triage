import { describe, expect, test } from "vitest";
import {
  blankDraft,
  triageDraftSchema,
  workOrderRequestSchema,
  type TriageDraft,
} from "./schema";

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

describe("workOrderRequestSchema", () => {
  test("accepts a manual work order with no AI draft or model", () => {
    const request = {
      assetId: "EX-014",
      notes: "",
      aiDraft: null,
      final: validDraft,
      model: null,
    };
    expect(workOrderRequestSchema.safeParse(request).success).toBe(true);
  });

  test("needs the model with an AI draft, and neither for a manual entry", () => {
    const base = { assetId: "EX-014", notes: "", final: validDraft };
    expect(
      workOrderRequestSchema.safeParse({ ...base, aiDraft: validDraft, model: null }).success,
    ).toBe(false);
    expect(
      workOrderRequestSchema.safeParse({ ...base, aiDraft: null, model: "anthropic/claude-sonnet-5.5" })
        .success,
    ).toBe(false);
    expect(
      workOrderRequestSchema.safeParse({
        ...base,
        aiDraft: validDraft,
        model: "anthropic/claude-sonnet-5.5",
      }).success,
    ).toBe(true);
  });

  test("rejects a final draft with no work order title", () => {
    const request = {
      assetId: "EX-014",
      notes: "",
      aiDraft: null,
      final: { ...validDraft, workOrder: { ...validDraft.workOrder, title: "" } },
      model: null,
    };
    expect(workOrderRequestSchema.safeParse(request).success).toBe(false);
  });
});

test("blankDraft is a valid draft once the titles are filled in", () => {
  const draft = blankDraft();
  draft.issue.title = "Leak";
  draft.workOrder.title = "Fix leak";
  expect(triageDraftSchema.safeParse(draft).success).toBe(true);
});
