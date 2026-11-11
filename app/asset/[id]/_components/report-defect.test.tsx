import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ReportDefect } from "./report-defect";

test("offers a Report a defect entry point that is not active yet", () => {
  render(<ReportDefect />);
  expect(
    screen.getByRole("region", { name: "Report a defect" }),
  ).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Report a defect" });
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription("Defect capture is not built yet.");
});
