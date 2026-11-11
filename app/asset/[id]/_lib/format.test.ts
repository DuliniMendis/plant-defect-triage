import { describe, expect, test } from "vitest";
import { describeServiceDue, formatDate, formatHours } from "./format";

test("formats hours with a thousands separator", () => {
  expect(formatHours(12480)).toBe("12,480 h");
});

test("formats a stored date without shifting the day", () => {
  expect(formatDate("2026-03-01")).toBe("1 Mar 2026");
  expect(formatDate("2025-12-31")).toBe("31 Dec 2025");
});

describe("describeServiceDue", () => {
  test("shows the hours left before the service", () => {
    expect(describeServiceDue(4250, 4500)).toEqual({
      text: "At 4,500 h, 250 h to go",
      overdue: false,
    });
  });

  test("flags a service due at the current reading", () => {
    expect(describeServiceDue(4500, 4500)).toEqual({
      text: "Due now at 4,500 h",
      overdue: true,
    });
  });

  test("flags an overdue service", () => {
    expect(describeServiceDue(4620, 4500)).toEqual({
      text: "Overdue by 120 h",
      overdue: true,
    });
  });
});
