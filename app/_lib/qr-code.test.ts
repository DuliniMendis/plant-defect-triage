import { readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { seedAssets } from "@/db/seed-data";
import { assetIdFromCode, lookUpCode, lookUpQrFile, unknownAssetCode } from "./qr-code";

const ids = ["EX-014", "GN-003", "TH-007"];

describe("assetIdFromCode", () => {
  test("takes a bare asset ID as it is", () => {
    expect(assetIdFromCode("EX-014")).toBe("EX-014");
  });

  test("ignores surrounding spaces and letter case", () => {
    expect(assetIdFromCode("  ex-014\n")).toBe("EX-014");
  });

  test("takes the ID from a link to an asset profile", () => {
    expect(assetIdFromCode("https://example.test/asset/GN-003")).toBe("GN-003");
    expect(assetIdFromCode("https://example.test/asset/gn-003/?from=qr")).toBe("GN-003");
  });
});

describe("lookUpCode", () => {
  test("finds a known asset", () => {
    expect(lookUpCode("TH-007", ids)).toEqual({ kind: "found", assetId: "TH-007" });
    expect(lookUpCode(" th-007 ", ids)).toEqual({ kind: "found", assetId: "TH-007" });
  });

  test("reports a code that matches no asset, keeping the code to show", () => {
    expect(lookUpCode(" ZZ-999 ", ids)).toEqual({ kind: "unknown", code: "ZZ-999" });
    expect(lookUpCode("hello world", ids)).toEqual({ kind: "unknown", code: "hello world" });
  });
});

describe("lookUpQrFile", () => {
  test("rejects a file that is not an image without trying to read it", async () => {
    const file = new File(["not an image"], "notes.txt", { type: "text/plain" });
    expect(await lookUpQrFile(file, ids)).toEqual({ kind: "not-image" });
  });
});

describe("saved QR code images (R3)", () => {
  const root = path.resolve(import.meta.dirname, "../..");

  test("demo-files/qr has exactly one PNG per seeded asset", async () => {
    const files = (await readdir(path.join(root, "demo-files", "qr"))).filter((f) =>
      f.endsWith(".png"),
    );
    expect(files.sort()).toEqual(seedAssets.map((a) => `${a.id}.png`).sort());
  });

  test("the unknown-asset sample's code matches no seeded asset", () => {
    expect(seedAssets.some((a) => a.id === unknownAssetCode)).toBe(false);
  });
});
