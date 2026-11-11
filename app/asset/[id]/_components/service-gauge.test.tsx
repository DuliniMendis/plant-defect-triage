import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { describeServiceDue } from "../_lib/service-due";
import { ServiceGauge } from "./service-gauge";

const meter = () =>
  screen.getByRole("meter", { name: "Hours left before the next service" });

test("reports the hours left out of a 500-hour interval", () => {
  render(<ServiceGauge serviceDue={describeServiceDue(4215, 4500)} />);
  expect(meter()).toHaveAttribute("aria-valuemin", "0");
  expect(meter()).toHaveAttribute("aria-valuemax", "500");
  expect(meter()).toHaveAttribute("aria-valuenow", "285");
  expect(meter()).toHaveAttribute("aria-valuetext", "285 h to go");
});

test("is empty and says the service is due when overdue", () => {
  render(<ServiceGauge serviceDue={describeServiceDue(4620, 4500)} />);
  expect(meter()).toHaveAttribute("aria-valuenow", "0");
  expect(meter()).toHaveAttribute("aria-valuetext", "Service due");
});
