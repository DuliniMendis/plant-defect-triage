import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DisclaimerFooter } from "./disclaimer-footer";

test("states that the demo is independent and not affiliated", () => {
  render(<DisclaimerFooter />);
  const footer = screen.getByRole("contentinfo");
  expect(footer).toHaveTextContent("Not affiliated with, endorsed by or sponsored by any company");
  expect(footer).toHaveTextContent("Not for commercial use");
});
