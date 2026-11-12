import { expect, test } from "vitest";
import type { Asset, HistoryEntry } from "@/db/schema";
import { assetContext, reportText, SYSTEM_PROMPT } from "./prompt";

const asset = {
  id: "GN-003",
  name: "60 kVA Generator",
  make: "Atlas Copco",
  model: "QAS 60",
  category: "Generator",
  site: "Westlink Civil Site",
  meterHours: 9870,
  nextServiceDueHours: 10000,
  status: "needs-attention",
} satisfies Asset;

const entry = {
  id: "GN-003-H2",
  assetId: "GN-003",
  date: "2026-09-10",
  kind: "repair",
  title: "Cleaned battery terminals",
  detail: "Light corrosion removed.",
  component: "Starting battery",
  severity: null,
  meterHours: 9500,
  status: "closed",
  seeded: true,
  workOrderId: null,
} satisfies HistoryEntry;

test("lists the asset and every history entry with its ID", () => {
  expect(assetContext(asset, [entry])).toBe(
    [
      "Asset GN-003: 60 kVA Generator",
      "Make and model: Atlas Copco QAS 60",
      "Category: Generator",
      "Site: Westlink Civil Site",
      "Meter hours: 9870 (next service due at 10000)",
      "Status: needs-attention",
      "",
      "History (1 entry, newest first):",
      "- [GN-003-H2] Cleaned battery terminals (2026-09-10, repair, component: Starting battery, 9500 h, closed)",
      "  Light corrosion removed.",
    ].join("\n"),
  );
});

test("is the same text every time for the same records, so it can be cached", () => {
  expect(assetContext(asset, [entry])).toBe(assetContext(asset, [entry]));
  expect(assetContext(asset, [])).toContain("No history recorded.");
});

test("the system prompt is long enough to be cached", () => {
  // Claude Sonnet 5.5 and Haiku 5.5 cache prefixes of 512 tokens or more. At
  // roughly 4 characters a token, 3,000 characters leaves a wide margin.
  expect(SYSTEM_PROMPT.length).toBeGreaterThan(3000);
  // Nothing that changes between requests, such as today's date.
  expect(SYSTEM_PROMPT).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
});

test("the report text adds the reviewer's answers after the notes", () => {
  expect(
    reportText("Oil on the boom", [{ question: "Hose or fitting?", answer: "The fitting" }], 1),
  ).toBe(
    [
      "Operator's notes:\nOil on the boom",
      "Answers to your earlier questions about this report:\nQ: Hose or fitting?\nA: The fitting",
      "1 photo follows.",
    ].join("\n\n"),
  );
  expect(reportText(" Oil ", [], 0)).toBe("Operator's notes:\nOil\n\nNo photos were attached.");
});
