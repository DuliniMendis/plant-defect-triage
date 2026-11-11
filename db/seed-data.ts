import type { assets, historyEntries } from "./schema";

// The demo fleet and its history (R29). Asset data is fictional; the makes and
// models are real equipment, named only to make the demo realistic.
//
// The first four assets are the demo assets: each has a sample defect photo
// and detailed history. The rest fill out the fleet so the list has enough
// assets to search, filter and page through; each has a recent service and,
// when it is not operational, the open issue that explains why.
//
// History IDs are fixed so links to them (repeat findings, milestone 7) stay
// valid after every reseed. Two assets carry history that sets up a repeat
// finding (technical plan v2, section 4):
// - EX-014 has had two boom hose leaks, for the excavator hose photo.
// - GN-003 has had a battery terminal clean and has an open slow-cranking issue,
//   for the generator battery corrosion photo.

type NewAsset = typeof assets.$inferInsert;
type NewHistoryEntry = typeof historyEntries.$inferInsert & { id: string };

const demoAssets: NewAsset[] = [
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

const demoHistory: NewHistoryEntry[] = [
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

// Supporting fleet. `issue` is the open issue behind a non-operational status.
type SupportingAsset = NewAsset & {
  serviceDate: string;
  issue?: {
    date: string;
    title: string;
    component: string;
    severity: NonNullable<NewHistoryEntry["severity"]>;
  };
};

const supportingAssets: SupportingAsset[] = [
  { id: "EX-009", name: "21t Excavator", make: "Komatsu", model: "PC210LC-11", category: "Excavator", site: "Northbank Rail Yard", meterHours: 4215, nextServiceDueHours: 4500, status: "operational", serviceDate: "2026-09-08" },
  { id: "EX-021", name: "5t Mini Excavator", make: "Kubota", model: "KX057-5", category: "Excavator", site: "Harbour Road Depot", meterHours: 1388, nextServiceDueHours: 1500, status: "operational", serviceDate: "2026-08-19" },
  { id: "EX-030", name: "13t Excavator", make: "Hitachi", model: "ZX135US-7", category: "Excavator", site: "Eastside Water Plant", meterHours: 2960, nextServiceDueHours: 3000, status: "needs-attention", serviceDate: "2026-06-24",
    issue: { date: "2026-11-03", title: "Slew ring grinding noise when turning left", component: "Slew drive", severity: "medium" } },
  { id: "WL-004", name: "Wheel Loader", make: "Caterpillar", model: "950 GC", category: "Wheel loader", site: "Riverside Quarry", meterHours: 7730, nextServiceDueHours: 8000, status: "operational", serviceDate: "2026-09-29" },
  { id: "WL-011", name: "Wheel Loader", make: "Volvo", model: "L90H", category: "Wheel loader", site: "Riverside Quarry", meterHours: 5104, nextServiceDueHours: 5500, status: "needs-attention", serviceDate: "2026-07-14",
    issue: { date: "2026-10-27", title: "Reversing camera screen flickers", component: "Cab electrics", severity: "low" } },
  { id: "SS-002", name: "Skid Steer Loader", make: "Bobcat", model: "S650", category: "Skid steer", site: "Westlink Civil Site", meterHours: 2340, nextServiceDueHours: 2500, status: "operational", serviceDate: "2026-09-15" },
  { id: "SS-008", name: "Skid Steer Loader", make: "CASE", model: "SV280B", category: "Skid steer", site: "Northbank Rail Yard", meterHours: 1675, nextServiceDueHours: 2000, status: "operational", serviceDate: "2026-08-05" },
  { id: "TH-012", name: "Telehandler", make: "Manitou", model: "MT 1840", category: "Telehandler", site: "Northbank Rail Yard", meterHours: 2890, nextServiceDueHours: 3000, status: "operational", serviceDate: "2026-07-30" },
  { id: "TH-015", name: "Telehandler", make: "Genie", model: "GTH-5519", category: "Telehandler", site: "Eastside Water Plant", meterHours: 1120, nextServiceDueHours: 1500, status: "operational", serviceDate: "2026-10-06" },
  { id: "DT-001", name: "Articulated Dump Truck", make: "Volvo", model: "A30G", category: "Dump truck", site: "Riverside Quarry", meterHours: 9410, nextServiceDueHours: 9500, status: "operational", serviceDate: "2026-10-12" },
  { id: "DT-006", name: "Articulated Dump Truck", make: "Caterpillar", model: "730", category: "Dump truck", site: "Riverside Quarry", meterHours: 11250, nextServiceDueHours: 11500, status: "out-of-service", serviceDate: "2026-08-25",
    issue: { date: "2026-11-05", title: "Transmission will not select reverse; awaiting parts", component: "Transmission", severity: "high" } },
  { id: "RL-003", name: "Smooth Drum Roller", make: "BOMAG", model: "BW 213 D-5", category: "Roller", site: "Westlink Civil Site", meterHours: 3305, nextServiceDueHours: 3500, status: "operational", serviceDate: "2026-09-01" },
  { id: "RL-010", name: "Smooth Drum Roller", make: "HAMM", model: "H 13i", category: "Roller", site: "Eastside Water Plant", meterHours: 1940, nextServiceDueHours: 2000, status: "needs-attention", serviceDate: "2026-06-10",
    issue: { date: "2026-10-21", title: "Vibration not engaging on high amplitude", component: "Drum vibration", severity: "medium" } },
  { id: "EW-005", name: "Boom Lift", make: "JLG", model: "600S", category: "Elevated work platform", site: "Harbour Road Depot", meterHours: 1560, nextServiceDueHours: 1750, status: "operational", serviceDate: "2026-09-22" },
  { id: "EW-018", name: "Scissor Lift", make: "Genie", model: "GS-3246", category: "Elevated work platform", site: "Northbank Rail Yard", meterHours: 870, nextServiceDueHours: 1000, status: "out-of-service", serviceDate: "2026-07-07",
    issue: { date: "2026-11-02", title: "Platform drifts down under load", component: "Lift hydraulics", severity: "critical" } },
  { id: "LT-002", name: "Mobile Light Tower", make: "Atlas Copco", model: "HiLight V5+", category: "Light tower", site: "Westlink Civil Site", meterHours: 5280, nextServiceDueHours: 5500, status: "operational", serviceDate: "2026-08-12" },
  { id: "GN-009", name: "100 kVA Generator", make: "Atlas Copco", model: "QAS 100", category: "Generator", site: "Eastside Water Plant", meterHours: 6620, nextServiceDueHours: 7000, status: "operational", serviceDate: "2026-09-18" },
  { id: "LV-031", name: "Dual-cab Ute", make: "Ford", model: "Ranger XLT", category: "Light vehicle", site: "Westlink Civil Site", meterHours: 1430, nextServiceDueHours: 1500, status: "operational", serviceDate: "2026-10-01" },
  { id: "LV-040", name: "Single-cab Ute", make: "Isuzu", model: "D-Max SX", category: "Light vehicle", site: "Northbank Rail Yard", meterHours: 980, nextServiceDueHours: 1000, status: "needs-attention", serviceDate: "2026-05-26",
    issue: { date: "2026-10-29", title: "Brake pedal feels soft", component: "Brakes", severity: "high" } },
  { id: "LV-044", name: "Tray-back Ute", make: "Toyota", model: "LandCruiser 79", category: "Light vehicle", site: "Riverside Quarry", meterHours: 3120, nextServiceDueHours: 3250, status: "operational", serviceDate: "2026-09-10" },
];

// About 150 hours before today's reading, rounded to a 10-hour mark.
const meterAtService = (asset: SupportingAsset) =>
  Math.floor((asset.meterHours - 150) / 10) * 10;

const supportingHistory: NewHistoryEntry[] = supportingAssets.flatMap((asset) => {
  const entries: NewHistoryEntry[] = [
    entry({
      id: `${asset.id}-H1`,
      assetId: asset.id,
      date: asset.serviceDate,
      kind: "schedule-check",
      title: "Scheduled service",
      detail: "Fluids and filters changed, general inspection completed.",
      meterHours: meterAtService(asset),
      status: "closed",
    }),
  ];
  if (asset.issue) {
    entries.push(
      entry({
        id: `${asset.id}-H2`,
        assetId: asset.id,
        date: asset.issue.date,
        kind: "issue",
        title: asset.issue.title,
        component: asset.issue.component,
        severity: asset.issue.severity,
        meterHours: asset.meterHours,
        status: "open",
      }),
    );
  }
  return entries;
});

export const seedAssets: NewAsset[] = [
  ...demoAssets,
  ...supportingAssets.map(
    (a): NewAsset => ({
      id: a.id,
      name: a.name,
      make: a.make,
      model: a.model,
      category: a.category,
      site: a.site,
      meterHours: a.meterHours,
      nextServiceDueHours: a.nextServiceDueHours,
      status: a.status,
    }),
  ),
];

export const seedHistory: NewHistoryEntry[] = [...demoHistory, ...supportingHistory];
