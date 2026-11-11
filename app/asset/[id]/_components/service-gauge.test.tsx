import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { describeServiceDue } from "../_lib/service-due";
import { ServiceGauge } from "./service-gauge";

function renderGauge(meterHours: number, nextServiceDueHours: number) {
  render(
    <ServiceGauge
      meterHours={meterHours}
      nextServiceDueHours={nextServiceDueHours}
      serviceDue={describeServiceDue(meterHours, nextServiceDueHours)}
    />,
  );
  return screen.getByRole("meter", { name: "Progress to the next service" });
}

test("is nearly full when the service is 200 h away", () => {
  const meter = renderGauge(6800, 7000);
  expect(meter).toHaveAttribute("aria-valuemin", "0");
  expect(meter).toHaveAttribute("aria-valuemax", "7000");
  expect(meter).toHaveAttribute("aria-valuenow", "6800");
  expect(meter).toHaveAttribute("aria-valuetext", "97%, 200 h to go");
  expect(meter).toHaveTextContent("97%");
});

test("is nearly empty when the service is 6,000 h away", () => {
  const meter = renderGauge(1000, 7000);
  expect(meter).toHaveAttribute("aria-valuenow", "1000");
  expect(meter).toHaveAttribute("aria-valuetext", "14%, 6000 h to go");
});

test("is full and says the service is due when overdue", () => {
  const meter = renderGauge(7120, 7000);
  expect(meter).toHaveAttribute("aria-valuenow", "7000");
  expect(meter).toHaveAttribute("aria-valuetext", "Service due");
  expect(meter).toHaveTextContent("100%");
});
