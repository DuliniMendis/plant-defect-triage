import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { seedAssets } from "@/db/seed-data";
import { assetLabel, photoUrl, qrCodes, samplePhotos, unknownQrUrl } from "./test-files";

const publicDir = path.resolve(import.meta.dirname, "../../../public");
// A URL the app serves, as the file behind it.
const served = (url: string) => path.join(publicDir, url);

describe("sample photos", () => {
  test("lists every photo in public/demo-files/photos, and nothing else", async () => {
    const files = (await readdir(served("/demo-files/photos"))).filter((f) =>
      f.endsWith(".jpg"),
    );
    expect(samplePhotos.map((p) => p.file).sort()).toEqual(files.sort());
  });

  test("each goes with a seeded asset", () => {
    const ids = seedAssets.map((a) => a.id);
    for (const photo of samplePhotos) expect(ids).toContain(photo.assetId);
  });

  test("links to the file under /demo-files/photos", () => {
    expect(photoUrl("excavator-hose-leak.jpg")).toBe(
      "/demo-files/photos/excavator-hose-leak.jpg",
    );
  });
});

describe("QR codes", () => {
  test("has one per seeded asset, in fleet order, each with a saved image", async () => {
    expect(qrCodes.map((c) => c.assetId)).toEqual(seedAssets.map((a) => a.id));
    for (const code of qrCodes) await access(served(code.url));
  });

  test("describes the asset by name, make and model", () => {
    expect(qrCodes[0]).toEqual({
      assetId: "EX-014",
      description: "20t Excavator, Caterpillar 320",
      url: "/demo-files/qr/EX-014.png",
    });
  });

  test("the unknown-asset code has a saved image", async () => {
    await access(served(unknownQrUrl));
  });
});

describe("assetLabel", () => {
  test("gives the ID and name", () => {
    expect(assetLabel("TH-007")).toBe("TH-007, Telehandler");
  });

  test("falls back to the ID for an asset that is not seeded", () => {
    expect(assetLabel("ZZ-999")).toBe("ZZ-999");
  });
});
