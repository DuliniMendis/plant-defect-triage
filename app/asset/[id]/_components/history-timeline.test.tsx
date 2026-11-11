import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { HistoryEntry } from "@/db/schema";
import { HistoryTimeline } from "./history-timeline";

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
