// Writes one QR code PNG per seeded asset into public/demo-files/qr/ (R3). Each code
// holds just the asset ID, which is what the fleet page's "Upload QR code"
// reads (R2). Also writes a code for an asset that does not exist, to show the
// "no matching asset" message in the demo.
//
// Run with `pnpm qr:generate` after changing the seeded fleet.
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { seedAssets } from "../db/seed-data";
import { unknownAssetCode } from "../app/_lib/qr-code";

const root = path.resolve(import.meta.dirname, "..");
const qrDir = path.join(root, "public", "demo-files", "qr");
const unknownFile = path.join(root, "public", "demo-files", "qr-unknown-asset.png");

const options: QRCode.QRCodeToFileOptions = {
  type: "png",
  errorCorrectionLevel: "M",
  width: 480,
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

async function main() {
  await mkdir(qrDir, { recursive: true });

  // Remove codes for assets that are no longer seeded.
  const keep = new Set(seedAssets.map((asset) => `${asset.id}.png`));
  for (const file of await readdir(qrDir)) {
    if (file.endsWith(".png") && !keep.has(file)) {
      await rm(path.join(qrDir, file));
    }
  }

  for (const asset of seedAssets) {
    await QRCode.toFile(path.join(qrDir, `${asset.id}.png`), asset.id, options);
  }
  await QRCode.toFile(unknownFile, unknownAssetCode, options);

  console.log(
    `Wrote ${seedAssets.length} QR codes to ${path.relative(root, qrDir)}/ and ${path.relative(root, unknownFile)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
