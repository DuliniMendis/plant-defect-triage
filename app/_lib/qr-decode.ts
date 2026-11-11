import jsQR from "jsqr";

// QR decoding for "Upload QR code" (R2). Loaded on demand by qr-code.ts.

/** Finds a QR code in RGBA pixels and returns its text, or null if none. */
export function decodeQr(pixels: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): string | null {
  const result = jsQR(pixels.data, pixels.width, pixels.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ? result.data : null;
}

// Large photos are scaled down before decoding: jsQR is slow on big images and
// a saved QR code is readable well below this size.
const maxSide = 1200;

/**
 * Reads a QR code from an image file in the browser, by drawing it on a
 * canvas. Returns the code's text, null if the image has no readable code, or
 * "not-image" if the file cannot be opened as an image.
 */
export async function readQrFromFile(file: Blob): Promise<string | null | "not-image"> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return "not-image";
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    // Paint white first so transparent PNGs decode as dark-on-light.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    return decodeQr(context.getImageData(0, 0, width, height));
  } finally {
    bitmap.close();
  }
}
