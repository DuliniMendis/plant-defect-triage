import { expect, test } from "vitest";
import { formatDate, formatHours } from "./format";

test("formats hours with a thousands separator", () => {
  expect(formatHours(12480)).toBe("12,480 h");
});

test("formats a stored date without shifting the day", () => {
  expect(formatDate("2026-03-01")).toBe("1 Mar 2026");
  expect(formatDate("2025-12-31")).toBe("31 Dec 2025");
});
