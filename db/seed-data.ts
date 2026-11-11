import type { assets, historyEntries } from "./schema";

// The demo fleet and its history (R29). Asset data is fictional; the makes and
// models are real equipment, named only to make the demo realistic.
//
// History IDs are fixed so links to them (repeat findings, milestone 7) stay
// valid after every reseed. Two assets carry history that sets up a repeat
// finding (technical plan v2, section 4):
// - EX-014 has had two boom hose leaks, for the excavator hose photo.
// - GN-003 has had a battery terminal clean and has an open slow-cranking issue,
//   for the generator battery corrosion photo.

type NewAsset = typeof assets.$inferInsert;
type NewHistoryEntry = typeof historyEntries.$inferInsert & { id: string };

export const seedAssets: NewAsset[] = [
  {
    id: "EX-014",
    name: "20t Excavator",
    make: "Caterpillar",
    model: "320",
    category: "Excavator",
    site: "Riverside Quarry",
    meterHours: 6842,
    nextServiceDueHours: 7000,
    status: "operational",
  },
  {
    id: "TH-007",
    name: "Telehandler",
    make: "JCB",
    model: "540-170 Loadall",
    category: "Telehandler",
    site: "Westlink Civil Site",
    meterHours: 3410,
    nextServiceDueHours: 3500,
    status: "operational",
  },
  {
    id: "LV-022",
    name: "Dual-cab Ute",
    make: "Toyota",
    model: "HiLux SR",
    category: "Light vehicle",
    site: "Harbour Road Depot",
    meterHours: 2150,
    nextServiceDueHours: 2500,
    status: "operational",
  },
  {
    id: "GN-003",
    name: "60 kVA Generator",
    make: "Atlas Copco",
    model: "QAS 60",
    category: "Generator",
    site: "Westlink Civil Site",
    meterHours: 9870,
    nextServiceDueHours: 10000,
    status: "needs-attention",
  },
];

const entry = (e: Omit<NewHistoryEntry, "seeded">): NewHistoryEntry => ({
  ...e,
  seeded: true,
});

export const seedHistory: NewHistoryEntry[] = [
  // EX-014: repeat boom hose leaks.
  entry({
    id: "EX-014-H1",
    assetId: "EX-014",
    date: "2026-03-18",
    kind: "issue",
    title: "Hydraulic oil weeping at boom cylinder hose",
    detail: "Operator reported an oil film on the boom near the cylinder hose fitting at pre-start.",
    component: "Boom hydraulics",
    severity: "medium",
    meterHours: 6120,
    status: "closed",
  }),
  entry({
    id: "EX-014-H2",
    assetId: "EX-014",
    date: "2026-03-19",
    kind: "repair",
    title: "Replaced boom cylinder hose",
    detail: "Hose replaced at the rod end. Fitting re-torqued and system tested under load.",
    component: "Boom hydraulics",
    meterHours: 6124,
    status: "closed",
  }),
  entry({
    id: "EX-014-H3",
    assetId: "EX-014",
    date: "2026-06-02",
    kind: "schedule-check",
    title: "6,500-hour service",
    detail: "Engine oil, filters and hydraulic return filter changed. No faults found.",
    meterHours: 6502,
    status: "closed",
  }),
  entry({
    id: "EX-014-H4",
    assetId: "EX-014",
    date: "2026-08-27",
    kind: "issue",
    title: "Hose leak at boom fitting, second occurrence",
    detail: "Leak at the same boom fitting as March. Hose outer cover chafed against a clamp.",
    component: "Boom hydraulics",
    severity: "high",
    meterHours: 6610,
    status: "closed",
  }),
  entry({
    id: "EX-014-H5",
    assetId: "EX-014",
    date: "2026-08-28",
    kind: "repair",
    title: "Replaced boom hose and moved clamp",
    detail: "New hose fitted and the clamp moved to stop chafing. Recommend checking the routing at next service.",
    component: "Boom hydraulics",
    meterHours: 6612,
    status: "closed",
  }),
  entry({
    id: "EX-014-H6",
    assetId: "EX-014",
    date: "2026-10-14",
    kind: "schedule-check",
    title: "Weekly pre-start inspection",
    detail: "Hoses, tracks and lights checked. No leaks seen.",
    meterHours: 6790,
    status: "closed",
  }),

  // TH-007
  entry({
    id: "TH-007-H1",
    assetId: "TH-007",
    date: "2026-04-09",
    kind: "schedule-check",
    title: "3,000-hour service",
    detail: "Boom wear pads inspected, engine and transmission oil changed.",
    meterHours: 3005,
    status: "closed",
  }),
  entry({
    id: "TH-007-H2",
    assetId: "TH-007",
    date: "2026-07-21",
    kind: "issue",
    title: "Front left tyre losing pressure",
    detail: "Tyre found 15 psi under at pre-start.",
    component: "Tyres and wheels",
    severity: "low",
    meterHours: 3240,
    status: "closed",
  }),
  entry({
    id: "TH-007-H3",
    assetId: "TH-007",
    date: "2026-07-22",
    kind: "repair",
    title: "Puncture repaired, front left tyre",
    detail: "Screw removed from the tread and the puncture plugged.",
    component: "Tyres and wheels",
    meterHours: 3242,
    status: "closed",
  }),

  // LV-022
  entry({
    id: "LV-022-H1",
    assetId: "LV-022",
    date: "2026-02-11",
    kind: "schedule-check",
    title: "Annual safety inspection",
    detail: "Passed. Brakes, lights and seatbelts in order.",
    meterHours: 1820,
    status: "closed",
  }),
  entry({
    id: "LV-022-H2",
    assetId: "LV-022",
    date: "2026-05-30",
    kind: "repair",
    title: "Replaced wiper blades",
    detail: "Both front blades replaced after streaking.",
    component: "Windscreen and wipers",
    meterHours: 1960,
    status: "closed",
  }),
  entry({
    id: "LV-022-H3",
    assetId: "LV-022",
    date: "2026-09-16",
    kind: "issue",
    title: "Stone chip on windscreen, passenger side",
    detail: "Small chip outside the driver's line of sight. Booked for resin repair.",
    component: "Windscreen and wipers",
    severity: "low",
    meterHours: 2080,
    status: "open",
  }),

  // GN-003: battery and starting history.
  entry({
    id: "GN-003-H1",
    assetId: "GN-003",
    date: "2026-05-12",
    kind: "repair",
    title: "Cleaned and greased battery terminals",
    detail: "White corrosion on the positive terminal. Cleaned, greased and the clamp tightened.",
    component: "Starting system",
    meterHours: 9310,
    status: "closed",
  }),
  entry({
    id: "GN-003-H2",
    assetId: "GN-003",
    date: "2026-07-01",
    kind: "schedule-check",
    title: "Load bank test",
    detail: "Held full rated load for 2 hours. Voltage and frequency within limits.",
    meterHours: 9520,
    status: "closed",
  }),
  entry({
    id: "GN-003-H3",
    assetId: "GN-003",
    date: "2026-10-30",
    kind: "issue",
    title: "Slow cranking on cold starts",
    detail: "Takes several attempts to start first thing in the morning.",
    component: "Starting system",
    severity: "medium",
    meterHours: 9840,
    status: "open",
  }),
];
