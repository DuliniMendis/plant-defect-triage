import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { FleetAsset } from "../_lib/filter-fleet";
import { AssetTable } from "./asset-table";

const excavator: FleetAsset = {
  id: "EX-014",
  name: "20t Excavator",
  make: "Caterpillar",
  model: "320",
  category: "Excavator",
  site: "Riverside Quarry",
  status: "operational",
};

const bodyRows = () =>
  screen
    .getAllByRole("row")
    .filter((row) => within(row).queryByRole("link") !== null);

test("has a column header for each field", () => {
  render(<AssetTable assets={[excavator]} />);
  const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
  expect(headers).toEqual(["ID", "Asset", "Type", "Site", "Status"]);
});

test("shows one row per asset with its ID, name, model, type, site and status", () => {
  render(<AssetTable assets={[excavator]} />);
  const [row] = bodyRows();
  expect(row).toHaveTextContent("EX-014");
  expect(row).toHaveTextContent("20t Excavator");
  expect(row).toHaveTextContent("Caterpillar 320");
  expect(row).toHaveTextContent("Excavator");
  expect(row).toHaveTextContent("Riverside Quarry");
  expect(row).toHaveTextContent("Operational");
});

test("each row links to the asset profile", () => {
  render(<AssetTable assets={[excavator]} />);
  expect(screen.getByRole("link", { name: "20t Excavator" })).toHaveAttribute(
    "href",
    "/asset/EX-014",
  );
});

test("keeps the given order, one row per asset", () => {
  const assets = ["DT-001", "EX-014", "TH-007"].map((id) => ({ ...excavator, id }));
  render(<AssetTable assets={assets} />);
  expect(bodyRows().map((row) => within(row).getByText(/^[A-Z]{2}-\d{3}$/).textContent)).toEqual([
    "DT-001",
    "EX-014",
    "TH-007",
  ]);
});

test.each([
  ["needs-attention", "Needs attention"],
  ["out-of-service", "Out of service"],
] as const)("labels the %s status", (status, label) => {
  render(<AssetTable assets={[{ ...excavator, status }]} />);
  expect(bodyRows()[0]).toHaveTextContent(label);
});
