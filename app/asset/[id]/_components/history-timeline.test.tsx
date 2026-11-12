import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { HistoryEntry } from "@/db/schema";
import { HistoryTimeline } from "./history-timeline";

vi.mock("../_lib/delete-issue", () => ({ deleteIssue: vi.fn() }));

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "h-1",
    assetId: "EX-014",
    date: "2026-01-01",
    kind: "issue",
    title: "Untitled",
    detail: "",
    component: null,
    severity: null,
    meterHours: null,
    status: "closed",
    seeded: true,
    workOrderId: null,
    ...overrides,
  };
}

const entries = [
  entry({
    id: "h-3",
    date: "2026-10-02",
    kind: "issue",
    title: "Hydraulic hose weeping at boom cylinder",
    detail: "Light oil film on the boom.",
    component: "Hydraulic hose",
    severity: "medium",
    meterHours: 4210,
    status: "open",
  }),
  entry({
    id: "h-2",
    date: "2026-07-15",
    kind: "repair",
    title: "Replaced boom hose",
  }),
  entry({
    id: "h-1",
    date: "2026-04-30",
    kind: "schedule-check",
    title: "500-hour service",
  }),
];

test("lists entries in the order given, which is newest first", () => {
  render(<HistoryTimeline entries={entries} />);

  const list = screen.getByRole("list", { name: "History" });
  const titles = within(list)
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
  expect(titles).toEqual([
    "Hydraulic hose weeping at boom cylinder",
    "Replaced boom hose",
    "500-hour service",
  ]);
});

test("shows each entry's kind, date, status and details", () => {
  render(<HistoryTimeline entries={entries} />);

  const [first, second, third] = within(
    screen.getByRole("list", { name: "History" }),
  ).getAllByRole("listitem");

  expect(first).toHaveTextContent("Issue");
  expect(first).toHaveTextContent("2 Oct 2026");
  expect(first).toHaveTextContent("Open");
  expect(first).toHaveTextContent("Light oil film on the boom.");
  expect(first).toHaveTextContent("ComponentHydraulic hose");
  expect(first).toHaveTextContent("Severitymedium");
  expect(first).toHaveTextContent("Meter4,210 h");
  expect(within(first).getByText("2 Oct 2026")).toHaveAttribute(
    "datetime",
    "2026-10-02",
  );

  expect(second).toHaveTextContent("Repair");
  expect(second).toHaveTextContent("Closed");
  expect(third).toHaveTextContent("Schedule check");
});

test("says so when there is no history", () => {
  render(<HistoryTimeline entries={[]} />);
  expect(screen.getByText("No history recorded yet.")).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

test("shows the photos saved with a work order on its entry (R24, R28)", () => {
  render(
    <HistoryTimeline
      entries={[
        entry({
          id: "h-wo",
          kind: "work-order",
          title: "Replace boom hose",
          workOrderId: "wo-1",
          seeded: false,
        }),
        entry({ id: "h-old", title: "Earlier issue" }),
      ]}
      photos={{
        "wo-1": [
          { id: "p-1", position: 1 },
          { id: "p-2", position: 2 },
        ],
      }}
    />,
  );

  const photos = screen.getByRole("list", { name: "Photos for Replace boom hose" });
  expect(within(photos).getByRole("img", { name: "Photo 1 for Replace boom hose" })).toHaveAttribute(
    "src",
    "/api/photos/p-1",
  );
  expect(within(photos).getAllByRole("img")).toHaveLength(2);
  expect(screen.queryAllByRole("list", { name: /^Photos for/ })).toHaveLength(1);
});

test("offers Delete on issues and work orders only", () => {
  render(
    <HistoryTimeline
      entries={[
        ...entries,
        entry({ id: "h-wo", kind: "work-order", title: "Replace boom hose", workOrderId: "wo-1" }),
      ]}
    />,
  );

  expect(
    screen.getByRole("button", { name: "Delete Hydraulic hose weeping at boom cylinder" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete Replace boom hose" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /^Delete / })).toHaveLength(2);
});
