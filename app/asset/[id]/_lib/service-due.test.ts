import { describe, expect, test } from "vitest";
import { describeServiceDue, SERVICE_INTERVAL_HOURS } from "./service-due";

describe("describeServiceDue text", () => {
  test("shows the due reading with the hours left in brackets", () => {
    expect(describeServiceDue(4215, 4500).text).toBe(
      "At 4,500 h (285 h to go)",
    );
  });

  test("says when the service is due at the current reading", () => {
    expect(describeServiceDue(4500, 4500)).toMatchObject({
      text: "Due now at 4,500 h",
      overdue: true,
    });
  });

  test("says how far overdue the service is", () => {
    expect(describeServiceDue(4620, 4500)).toMatchObject({
      text: "Overdue by 120 h (due at 4,500 h)",
      overdue: true,
    });
  });
});

describe("describeServiceDue level", () => {
  test.each([
    // [hours left, level]
    [500, "good"],
    [251, "good"],
    [250, "fair"],
    [126, "fair"],
    [125, "low"],
    [51, "low"],
    [50, "due"],
    [1, "due"],
    [0, "due"],
    [-120, "due"],
  ] as const)("%i h left is %s", (left, level) => {
    expect(describeServiceDue(10_000 - left, 10_000).level).toBe(level);
  });

  test("the share left runs from a full interval down to empty", () => {
    expect(describeServiceDue(4000, 4500).fraction).toBe(1);
    expect(describeServiceDue(4215, 4500)).toMatchObject({
      hoursLeft: 285,
      fraction: 285 / SERVICE_INTERVAL_HOURS,
    });
    expect(describeServiceDue(4620, 4500)).toMatchObject({
      hoursLeft: 0,
      fraction: 0,
    });
  });

  test("caps the hours left at one interval", () => {
    expect(describeServiceDue(3000, 4500)).toMatchObject({
      text: "At 4,500 h (1,500 h to go)",
      hoursLeft: SERVICE_INTERVAL_HOURS,
      fraction: 1,
      level: "good",
    });
  });
});
