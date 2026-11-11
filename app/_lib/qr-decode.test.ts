import QRCode from "qrcode";
import { describe, expect, test } from "vitest";
import { decodeQr } from "./qr-decode";

// RGBA pixels for a QR code holding `text`, drawn the way make-qr.ts draws
// one: dark modules on white, with a four-module quiet zone.
function qrPixels(text: string, moduleSize = 6, margin = 4) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const side = (modules.size + margin * 2) * moduleSize;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const row = Math.floor(y / moduleSize) - margin;
      const col = Math.floor(x / moduleSize) - margin;
      const inside = row >= 0 && col >= 0 && row < modules.size && col < modules.size;
      if (inside && modules.get(row, col)) {
        const i = (y * side + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }
  return { data, width: side, height: side };
}

describe("decodeQr", () => {
  test("reads the asset ID from a QR code image", () => {
    expect(decodeQr(qrPixels("EX-014"))).toBe("EX-014");
  });

  test("reads a light-on-dark code too", () => {
    const pixels = qrPixels("GN-003");
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255 - pixels.data[i];
    }
    expect(decodeQr(pixels)).toBe("GN-003");
  });

  test("returns null when the image has no QR code", () => {
    const side = 200;
    const data = new Uint8ClampedArray(side * side * 4);
    for (let i = 0; i < data.length; i += 4) {
      // A grey gradient with nothing to find.
      data[i] = data[i + 1] = data[i + 2] = (i / 4) % 256;
      data[i + 3] = 255;
    }
    expect(decodeQr({ data, width: side, height: side })).toBeNull();
  });
});
