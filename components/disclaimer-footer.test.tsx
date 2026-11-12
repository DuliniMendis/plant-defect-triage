import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DisclaimerFooter } from "./disclaimer-footer";

test("states that the demo is a non-commercial concept with fictional data", () => {
  render(<DisclaimerFooter />);
  const footer = screen.getByRole("contentinfo");
  expect(footer).toHaveTextContent("fictional asset data");
  expect(footer).toHaveTextContent("Not for commercial use");
});
