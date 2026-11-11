import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Asset } from "@/db/schema";
import { KeyFacts } from "./key-facts";

const excavator: Asset = {
  id: "EX-014",
  name: "Excavator 14",
  make: "Komatsu",
  model: "PC210LC-11",
  category: "Excavator",
  site: "Northgate Quarry",
  meterHours: 4250,
  nextServiceDueHours: 4500,
  status: "needs-attention",
};

function factValue(term: string) {
  const facts = screen.getByRole("region", { name: "Key facts" });
  const dt = within(facts).getByText(term, { selector: "dt" });
  return dt.nextElementSibling;
}

test("shows make, model, site, meter hours, next service due and status", () => {
  render(<KeyFacts asset={excavator} />);

  expect(factValue("Make")).toHaveTextContent("Komatsu");
  expect(factValue("Model")).toHaveTextContent("PC210LC-11");
  expect(factValue("Site")).toHaveTextContent("Northgate Quarry");
  expect(factValue("Meter hours")).toHaveTextContent("4,250 h");
  expect(factValue("Next service due")).toHaveTextContent(
    "At 4,500 h (250 h to go)",
  );
  expect(factValue("Status")).toHaveTextContent("Needs attention");
});

test("shows a gauge of the hours left before the service", () => {
  render(<KeyFacts asset={excavator} />);
  const gauge = screen.getByRole("meter", {
    name: "Progress to the next service",
  });
  expect(factValue("Next service due")).toContainElement(gauge);
  expect(gauge).toHaveAttribute("aria-valuenow", "4250");
  expect(gauge).toHaveAttribute("aria-valuemax", "4500");
});

test("says when the service is overdue", () => {
  render(<KeyFacts asset={{ ...excavator, meterHours: 4620 }} />);
  expect(factValue("Next service due")).toHaveTextContent(
    "Overdue by 120 h (due at 4,500 h)",
  );
});
