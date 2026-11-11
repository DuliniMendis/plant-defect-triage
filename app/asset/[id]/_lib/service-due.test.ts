import { describe, expect, test } from "vitest";
import { describeServiceDue } from "./service-due";

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
      hoursLeft: 0,
    });
  });
});

describe("describeServiceDue progress", () => {
  test("is nearly full when the service is close", () => {
    expect(describeServiceDue(6800, 7000)).toMatchObject({
      hoursLeft: 200,
      progress: 6800 / 7000,
    });
  });

  test("is nearly empty when the service is far off", () => {
    expect(describeServiceDue(1000, 7000)).toMatchObject({
      hoursLeft: 6000,
      progress: 1000 / 7000,
    });
  });

  test("is full when due or overdue", () => {
    expect(describeServiceDue(7000, 7000).progress).toBe(1);
    expect(describeServiceDue(7120, 7000).progress).toBe(1);
  });
});

describe("describeServiceDue level", () => {
  test("is green far from the service and yellow 200 h out", () => {
    expect(describeServiceDue(1000, 7000).level).toBe("good");
    expect(describeServiceDue(6800, 7000).level).toBe("fair");
  });

  test.each([
    // [hours left, level]
    [6000, "good"],
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
});
