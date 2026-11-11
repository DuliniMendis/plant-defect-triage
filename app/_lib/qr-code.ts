// Reading QR codes for the fleet page's "Upload QR code" (R2). A code holds an
// asset ID such as "EX-014" (data model: the asset `id` is the QR content).
// The decoder itself is in qr-decode.ts, loaded only when a file is uploaded so
// the fleet page does not download it up front.

/** The code in demo-files/qr-unknown-asset.png: an ID no seeded asset has. */
export const unknownAssetCode = "ZZ-999";

export type QrLookup =
  | { kind: "found"; assetId: string }
  | { kind: "unknown"; code: string }
  | { kind: "no-code" }
  | { kind: "not-image" };

/**
 * The asset ID a code refers to. Accepts the bare ID in any case, with or
 * without surrounding spaces, and also a link to an asset profile
 * (".../asset/EX-014"), in case a code was made from a URL.
 */
export function assetIdFromCode(code: string): string {
  const text = code.trim();
  const fromLink = text.match(/\/asset\/([^/?#\s]+)\/?(?:[?#].*)?$/i);
  const id = fromLink ? decodeURIComponent(fromLink[1]) : text;
  return id.toUpperCase();
}

/** Matches a decoded code against the fleet. */
export function lookUpCode(code: string, knownIds: Iterable<string>): QrLookup {
  const assetId = assetIdFromCode(code);
  for (const id of knownIds) {
    if (id.toUpperCase() === assetId) return { kind: "found", assetId: id };
  }
  return { kind: "unknown", code: code.trim() };
}

/** Reads an uploaded file and matches its code against the fleet. */
export async function lookUpQrFile(file: Blob, knownIds: Iterable<string>): Promise<QrLookup> {
  if (file.type && !file.type.startsWith("image/")) return { kind: "not-image" };
  const { readQrFromFile } = await import("./qr-decode");
  const code = await readQrFromFile(file);
  if (code === "not-image") return { kind: "not-image" };
  if (code === null) return { kind: "no-code" };
  return lookUpCode(code, knownIds);
}
