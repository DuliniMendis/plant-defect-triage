import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DisclaimerFooter } from "./disclaimer-footer";

test("states that the demo is not a Sitemate product", () => {
  render(<DisclaimerFooter />);
  const footer = screen.getByRole("contentinfo");
  expect(footer).toHaveTextContent("Not a Sitemate product");
  expect(footer).toHaveTextContent("Not for commercial use");
});
