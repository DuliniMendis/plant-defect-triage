import type { AiFill } from "./ai-fill";

/** A model answer for tests, with untidy text to check the server tidies it. */
export function aiFill(overrides: Partial<AiFill["issue"]> = {}): AiFill {
  return {
    issue: {
      title: " Boom hose leak ",
      description: "Oil dripping at the boom fitting.",
      component: "Boom hydraulics",
      severity: "high",
      severityReason: "Active hydraulic leak under load.",
      safeToOperate: true,
      ...overrides,
    },
    photoObservations: ["Wet hose at the fitting", " "],
    repeat: {
      isRepeat: true,
      relatedHistoryIds: ["EX-014-H4", "EX-014-H4", "EX-014-H99"],
      summary: "Same fitting as August.",
    },
    workOrder: {
      title: "Replace boom hose",
      tasks: ["Isolate", " Replace hose ", ""],
      parts: ["Hose assembly"],
      estimatedHours: 2,
    },
    confidence: "medium",
    clarifyingQuestion: "  ",
  };
}
