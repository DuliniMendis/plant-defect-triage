import { seedAssets } from "@/db/seed-data";

// What the Test files page offers for download. The files themselves are in
// public/demo-files/, which the app serves at /demo-files/.

export type SamplePhoto = {
  /** File name in public/demo-files/photos/. */
  file: string;
  title: string;
  shows: string;
  /** The demo asset whose history the photo goes with. */
  assetId: string;
  /** Short form of the entry in public/demo-files/photos/CREDITS.md. */
  source: string;
};

export const samplePhotos: SamplePhoto[] = [
  {
    file: "excavator-hose-leak.jpg",
    title: "Excavator hose leak",
    shows: "A hydraulic hose leaking oil at a boom fitting. This asset has had two boom hose leaks before, so the AI should flag a repeat.",
    assetId: "EX-014",
    source: "AI-generated for this demo",
  },
  {
    file: "telehandler-tyre-cut.jpg",
    title: "Telehandler tyre cut",
    shows: "A deep cut in a tyre sidewall with the cords exposed.",
    assetId: "TH-007",
    source: "AI-generated for this demo",
  },
  {
    file: "ute-cracked-windscreen.jpg",
    title: "Ute cracked windscreen",
    shows: "A stone chip with a crack running across the windscreen.",
    assetId: "LV-022",
    source: "AI-generated for this demo",
  },
  {
    file: "generator-battery-corrosion.jpg",
    title: "Generator battery corrosion",
    shows: "A corroded battery terminal. This asset has had its battery terminals cleaned before and has an open slow-cranking issue, so the AI should flag a repeat.",
    assetId: "GN-003",
    source: "Wikimedia Commons, public domain (CC0)",
  },
  {
    file: "excavator-unclear.jpg",
    title: "Unclear excavator photo",
    shows: "Deliberately unreadable. Use it to see the AI ask a clarifying question instead of guessing.",
    assetId: "EX-014",
    source: "Made from the hose leak photo for this demo",
  },
];

export const photoUrl = (file: string) => `/demo-files/photos/${file}`;

export type QrCode = {
  assetId: string;
  /** Name, make and model, such as "20t Excavator, Caterpillar 320". */
  description: string;
  url: string;
};

/** One code per seeded asset, the four demo assets first. */
export const qrCodes: QrCode[] = seedAssets.map((asset) => ({
  assetId: asset.id,
  description: `${asset.name}, ${asset.make} ${asset.model}`,
  url: `/demo-files/qr/${asset.id}.png`,
}));

/** A code no asset has, for the "No matching asset" message. */
export const unknownQrUrl = "/demo-files/qr-unknown-asset.png";

export function assetLabel(assetId: string): string {
  const asset = seedAssets.find((a) => a.id === assetId);
  return asset ? `${asset.id}, ${asset.name}` : assetId;
}
