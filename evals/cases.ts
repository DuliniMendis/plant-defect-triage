import type { Confidence, Severity } from "@/lib/schema";

// Fixed triage test cases (technical plan v2, section 11; DUL-56). Each case is
// a report on one of the four demo assets, run against that asset's seeded
// history from `db/seed-data.ts`.
//
// Kinds, from the plan:
// - clear: an obvious defect with no matching history.
// - repeat: a defect that repeats seeded history; the draft must link it.
// - safety: a safety-critical defect; severity must not be under-rated.
// - unclear: the photo or notes do not let anyone judge the defect; the draft
//   must ask rather than guess.
// - contradicting: the notes and the photo disagree; the draft must notice.
//
// Expectations list only what a reviewer would insist on. Where two answers
// are both reasonable (high or critical for an active boom leak, say), both
// are allowed.

export const caseKinds = ["clear", "repeat", "safety", "unclear", "contradicting"] as const;
export type CaseKind = (typeof caseKinds)[number];

/**
 * A photo from `public/demo-files/photos/`. `unclear` makes it blurred, dark and
 * small at run time, standing in for a photo taken badly on site.
 */
export type CasePhoto = { file: string; unclear?: boolean };

export type Expectations = {
  /** Allowed severities. Anything below the lowest is counted as under-rated. */
  severity?: readonly Severity[];
  safeToOperate?: boolean;
  /**
   * `false`: must not claim a repeat. Otherwise must claim one, linking every
   * ID in `allOf` and at least one ID in `anyOf`.
   */
  repeat?: false | { allOf?: readonly string[]; anyOf?: readonly string[] };
  /** Must (true) or must not (false) ask a clarifying question. */
  clarifyingQuestion?: boolean;
  confidence?: readonly Confidence[];
  /** Must reuse this component name from the history, exactly. */
  component?: string;
};

export type TriageCase = {
  id: string;
  assetId: string;
  kind: CaseKind;
  notes: string;
  photos: readonly CasePhoto[];
  expect: Expectations;
};

export const triageCases: readonly TriageCase[] = [
  // EX-014, 20t Excavator. History: boom hose leaks in March (H1, H2) and
  // August (H4, H5) at the same fitting.
  {
    id: "ex-014-repeat-hose",
    assetId: "EX-014",
    kind: "repeat",
    notes:
      "Oil leaking from the boom hose near the fitting again. Dripping onto the track after about an hour of digging.",
    photos: [{ file: "excavator-hose-leak.jpg" }],
    expect: {
      severity: ["high", "critical"],
      repeat: { anyOf: ["EX-014-H4", "EX-014-H1"] },
      component: "Boom hydraulics",
      clarifyingQuestion: false,
    },
  },
  {
    id: "ex-014-clear-door",
    assetId: "EX-014",
    kind: "clear",
    notes: "Cab door latch is sticking. Door needs a hard push to close and sometimes pops open on rough ground.",
    photos: [],
    expect: {
      severity: ["low", "medium"],
      repeat: false,
    },
  },
  {
    id: "ex-014-unclear-photo",
    assetId: "EX-014",
    kind: "unclear",
    notes: "Something looks wet near the arm.",
    photos: [{ file: "excavator-hose-leak.jpg", unclear: true }],
    expect: {
      clarifyingQuestion: true,
      confidence: ["low", "medium"],
    },
  },
  {
    id: "ex-014-contradicting",
    assetId: "EX-014",
    kind: "contradicting",
    notes: "Track tension feels loose on the left side. No leaks anywhere, checked all the hoses.",
    photos: [{ file: "excavator-hose-leak.jpg" }],
    expect: {
      clarifyingQuestion: true,
      confidence: ["low", "medium"],
    },
  },

  // TH-007, Telehandler. History: a slow puncture on the front left tyre.
  {
    id: "th-007-safety-tyre",
    assetId: "TH-007",
    kind: "safety",
    notes: "Deep cut in the front right tyre sidewall, cords showing. Noticed at pre-start.",
    photos: [{ file: "telehandler-tyre-cut.jpg" }],
    expect: {
      severity: ["high", "critical"],
      safeToOperate: false,
      component: "Tyres and wheels",
    },
  },
  {
    id: "th-007-clear-beeper",
    assetId: "TH-007",
    kind: "clear",
    notes: "Reversing beeper not working. Lights and everything else fine.",
    photos: [],
    expect: {
      severity: ["low", "medium", "high"],
      repeat: false,
    },
  },

  // LV-022, Dual-cab Ute. History: an open stone chip on the windscreen (H3).
  {
    id: "lv-022-repeat-windscreen",
    assetId: "LV-022",
    kind: "repeat",
    notes: "The stone chip on the passenger side has spread into a crack right across the windscreen.",
    photos: [{ file: "ute-cracked-windscreen.jpg" }],
    expect: {
      severity: ["medium", "high"],
      repeat: { allOf: ["LV-022-H3"] },
      component: "Windscreen and wipers",
    },
  },
  {
    id: "lv-022-safety-brakes",
    assetId: "LV-022",
    kind: "safety",
    notes: "Brakes grinding badly and the pedal goes almost to the floor before it stops.",
    photos: [],
    expect: {
      severity: ["critical"],
      safeToOperate: false,
      repeat: false,
    },
  },

  // GN-003, 60 kVA Generator. History: battery terminals cleaned (H1) and an
  // open slow-cranking issue (H3).
  {
    id: "gn-003-repeat-battery",
    assetId: "GN-003",
    kind: "repeat",
    notes: "Heavy white corrosion on the battery terminals again. Slow to crank this morning.",
    photos: [{ file: "generator-battery-corrosion.jpg" }],
    expect: {
      severity: ["medium", "high"],
      repeat: { anyOf: ["GN-003-H1", "GN-003-H3"] },
      component: "Starting system",
    },
  },
  {
    id: "gn-003-safety-fuel",
    assetId: "GN-003",
    kind: "safety",
    notes: "Strong diesel smell. Fuel is dripping onto the exhaust manifold while it runs.",
    photos: [],
    expect: {
      severity: ["critical"],
      safeToOperate: false,
      repeat: false,
    },
  },
  {
    id: "gn-003-clear-gauge",
    assetId: "GN-003",
    kind: "clear",
    notes: "Plastic cover on the fuel gauge is cracked. Gauge still reads fine.",
    photos: [],
    expect: {
      severity: ["low"],
      safeToOperate: true,
      repeat: false,
      clarifyingQuestion: false,
    },
  },
  {
    id: "gn-003-contradicting",
    assetId: "GN-003",
    kind: "contradicting",
    notes: "Battery terminals corroded, see photo.",
    photos: [{ file: "telehandler-tyre-cut.jpg" }],
    expect: {
      clarifyingQuestion: true,
      confidence: ["low", "medium"],
    },
  },
];
