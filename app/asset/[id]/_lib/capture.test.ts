import { describe, expect, test } from "vitest";
import {
  canContinue,
  describeRejections,
  fitWithin,
  MAX_PHOTOS,
  selectPhotos,
} from "./capture";

const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("selectPhotos", () => {
  test("accepts images up to the limit of 3", () => {
    const files = ["a.jpg", "b.jpg", "c.jpg", "d.jpg"].map(jpeg);
    const { accepted, rejected } = selectPhotos(0, files);
    expect(accepted.map((f) => f.name)).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(rejected).toEqual([{ name: "d.jpg", reason: "too-many" }]);
  });

  test("counts photos already added", () => {
    const { accepted, rejected } = selectPhotos(2, [jpeg("a.jpg"), jpeg("b.jpg")]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toEqual([{ name: "b.jpg", reason: "too-many" }]);
  });

  test("refuses files that are not JPEG, PNG or WebP", () => {
    const pdf = new File(["x"], "manual.pdf", { type: "application/pdf" });
    const png = new File(["x"], "leak.png", { type: "image/png" });
    const { accepted, rejected } = selectPhotos(0, [pdf, png]);
    expect(accepted).toEqual([png]);
    expect(rejected).toEqual([{ name: "manual.pdf", reason: "not-an-image" }]);
  });

  test("a non-image does not use up a slot", () => {
    const pdf = new File(["x"], "manual.pdf", { type: "application/pdf" });
    const { accepted } = selectPhotos(MAX_PHOTOS - 1, [pdf, jpeg("a.jpg")]);
    expect(accepted.map((f) => f.name)).toEqual(["a.jpg"]);
  });
});

describe("describeRejections", () => {
  test("is empty when nothing was refused", () => {
    expect(describeRejections([])).toBe("");
  });

  test("names the files and the reason", () => {
    expect(
      describeRejections([
        { name: "manual.pdf", reason: "not-an-image" },
        { name: "d.jpg", reason: "too-many" },
      ]),
    ).toBe(
      "manual.pdf is not a JPEG, PNG or WebP image. You can add up to 3 photos, so d.jpg was not added.",
    );
  });

  test("uses plurals for several files", () => {
    expect(
      describeRejections([
        { name: "d.jpg", reason: "too-many" },
        { name: "e.jpg", reason: "too-many" },
      ]),
    ).toBe("You can add up to 3 photos, so d.jpg, e.jpg were not added.");
  });
});

describe("fitWithin", () => {
  test("scales a landscape photo to 1500px wide", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1500, height: 1125 });
  });

  test("scales a portrait photo to 1500px tall", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1125, height: 1500 });
  });

  test("leaves a small photo at its size", () => {
    expect(fitWithin(960, 720)).toEqual({ width: 960, height: 720 });
  });
});

describe("canContinue", () => {
  test("needs some notes; photos alone are not enough", () => {
    expect(canContinue("")).toBe(false);
    expect(canContinue("   \n")).toBe(false);
    expect(canContinue("Hose weeping at the boom")).toBe(true);
  });
});
