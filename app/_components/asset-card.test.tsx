import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AssetCard } from "./asset-card";

const excavator = {
  id: "EX-014",
  name: "20t Excavator",
  make: "Caterpillar",
  model: "320",
  site: "Riverside Quarry",
  status: "operational" as const,
};

test("shows the asset's name, ID, site and status", () => {
  render(<AssetCard asset={excavator} />);
  const card = screen.getByRole("link", { name: /20t Excavator/ });
  expect(card).toHaveTextContent("EX-014");
  expect(card).toHaveTextContent("Caterpillar 320");
  expect(card).toHaveTextContent("Riverside Quarry");
  expect(card).toHaveTextContent("Operational");
});

test("links to the asset profile", () => {
  render(<AssetCard asset={excavator} />);
  expect(screen.getByRole("link", { name: /20t Excavator/ })).toHaveAttribute(
    "href",
    "/asset/EX-014",
  );
});

test.each([
  ["needs-attention", "Needs attention"],
  ["out-of-service", "Out of service"],
] as const)("labels the %s status", (status, label) => {
  render(<AssetCard asset={{ ...excavator, status }} />);
  expect(screen.getByRole("link")).toHaveTextContent(label);
});
