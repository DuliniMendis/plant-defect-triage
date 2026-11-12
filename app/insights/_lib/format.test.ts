import { expect, test } from "vitest";
import { formatCount, formatPercent, formatSeconds, formatUsd, plural } from "./format";

test("formats dollars, keeping more places for fractions of a cent", () => {
  expect(formatUsd(0.0123)).toBe("$0.0123");
  expect(formatUsd(1.5)).toBe("$1.50");
  expect(formatUsd(0)).toBe("$0.00");
  expect(formatUsd(null)).toBe("–");
});

test("formats seconds, percentages, counts and plurals", () => {
  expect(formatSeconds(8470)).toBe("8.5 s");
  expect(formatPercent(0.666)).toBe("67%");
  expect(formatPercent(null)).toBe("–");
  expect(formatCount(5123.4)).toBe("5,123");
  expect(formatCount(1.25, 1)).toBe("1.3");
  expect(plural(1, "run")).toBe("1 run");
  expect(plural(3, "run")).toBe("3 runs");
});
