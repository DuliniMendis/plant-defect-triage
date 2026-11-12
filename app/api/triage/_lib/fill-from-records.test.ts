import { describe, expect, test } from "vitest";
import type { HistoryEntry } from "@/db/schema";
import { blankDraft, type TriageDraft } from "@/lib/schema";
import { fillFromRecords, priorityFor, type PastWorkOrder } from "./fill-from-records";
import { aiFill } from "./test-fixtures";

const history = [{ id: "EX-014-H4" }, { id: "EX-014-H5" }] as HistoryEntry[];

function pastOrder(
  approvedAt: string,
  component: string,
  workOrder: Partial<TriageDraft["workOrder"]>,
): PastWorkOrder {
  const final = blankDraft();
  final.issue.component = component;
  final.workOrder = { ...final.workOrder, title: "Earlier hose job", ...workOrder };
  return { id: approvedAt, approvedAt: new Date(approvedAt), final };
}

describe("priorityFor", () => {
  test.each([
    ["low", true, "routine"],
    ["medium", true, "routine"],
    ["high", true, "urgent"],
    ["critical", true, "immediate"],
    ["low", false, "immediate"],
    ["high", false, "immediate"],
  ] as const)("%s severity, safe %s: %s", (severity, safe, expected) => {
    expect(priorityFor(severity, safe)).toBe(expected);
  });
});

describe("fillFromRecords", () => {
  test("sets priority and take-out-of-service by rule, not by the model", () => {
    const { draft, filled } = fillFromRecords(aiFill({ safeToOperate: false }), {
      history,
      pastWorkOrders: [],
    });
    expect(draft.workOrder.priority).toBe("immediate");
    expect(draft.workOrder.takeOutOfService).toBe(true);
    expect(filled).toEqual([
      {
        path: "workOrder.priority",
        source: "rule",
        note: "Set to immediate because the asset is not safe to operate.",
      },
      {
        path: "workOrder.takeOutOfService",
        source: "rule",
        note: "Taken out of service because it is not safe to operate.",
      },
    ]);
  });

  test("keeps the model's parts and hours when no earlier work order covers the component", () => {
    const { draft, filled } = fillFromRecords(aiFill(), {
      history,
      pastWorkOrders: [pastOrder("2026-10-01", "Tracks", { parts: ["Track pad"], estimatedHours: 6 })],
    });
    expect(draft.workOrder.parts).toEqual(["Hose assembly"]);
    expect(draft.workOrder.estimatedHours).toBe(2);
    expect(filled.map((f) => f.path)).not.toContain("workOrder.parts");
  });

  test("takes parts and hours from the latest work order on the same component", () => {
    const { draft, filled } = fillFromRecords(aiFill({ component: " boom  Hydraulics" }), {
      history,
      pastWorkOrders: [
        pastOrder("2026-09-01T00:00:00Z", "Boom hydraulics", { parts: ["Old hose"], estimatedHours: 4 }),
        pastOrder("2026-11-01T00:00:00Z", "Boom hydraulics", {
          title: "Replace boom cylinder hose",
          parts: ["Hose 1/2in", "O-ring kit"],
          estimatedHours: 2.5,
        }),
      ],
    });
    expect(draft.workOrder.parts).toEqual(["Hose 1/2in", "O-ring kit"]);
    expect(draft.workOrder.estimatedHours).toBe(2.5);
    expect(filled).toContainEqual({
      path: "workOrder.parts",
      source: "records",
      note: "From the work order “Replace boom cylinder hose” approved 1 Nov 2026.",
    });
    expect(filled.map((f) => f.path)).toContain("workOrder.estimatedHours");
  });

  test("keeps only repeat links to real history entries, without duplicates", () => {
    const { draft } = fillFromRecords(aiFill(), { history, pastWorkOrders: [] });
    expect(draft.repeat).toEqual({
      isRepeat: true,
      relatedHistoryIds: ["EX-014-H4"],
      summary: "Same fitting as August.",
    });
  });

  test("drops a repeat finding that points only at invented history", () => {
    const ai = aiFill();
    ai.repeat.relatedHistoryIds = ["EX-014-H99"];
    const { draft } = fillFromRecords(ai, { history, pastWorkOrders: [] });
    expect(draft.repeat).toEqual({ isRepeat: false, relatedHistoryIds: [], summary: "" });
  });

  test("tidies text and turns a blank question into none", () => {
    const { draft } = fillFromRecords(aiFill(), { history, pastWorkOrders: [] });
    expect(draft.issue.title).toBe("Boom hose leak");
    expect(draft.photoObservations).toEqual(["Wet hose at the fitting"]);
    expect(draft.workOrder.tasks).toEqual(["Isolate", "Replace hose"]);
    expect(draft.clarifyingQuestion).toBeNull();
  });
});
