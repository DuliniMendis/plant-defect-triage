import { expect, test, vi } from "vitest";
import { lookUpCost } from "./run-cost";

const sleep = vi.fn(async () => {});

test("returns the cost once the gateway has it", async () => {
  const lookup = vi
    .fn()
    .mockRejectedValueOnce(new Error("not found"))
    .mockResolvedValueOnce({ totalCost: 0.0123 });
  await expect(lookUpCost("gen_1", { lookup, sleep, delaysS: [1, 2, 3] })).resolves.toBe(0.0123);
  expect(lookup).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenNthCalledWith(1, 1000);
  expect(sleep).toHaveBeenNthCalledWith(2, 2000);
});

test("gives up with null rather than reporting zero", async () => {
  const lookup = vi.fn().mockRejectedValue(new Error("not found"));
  await expect(lookUpCost("gen_1", { lookup, sleep, delaysS: [1, 1] })).resolves.toBeNull();
  expect(lookup).toHaveBeenCalledTimes(2);
});
