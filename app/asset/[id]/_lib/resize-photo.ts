import { fitWithin } from "./capture";

export type ResizedPhoto = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Shrinks a photo in the browser so its longest side is about 1,500px, and
 * re-encodes it as JPEG. Keeps requests small once photos are sent for triage
 * and storage (technical plan v2, section 5). Browser only.
 */
export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser cannot resize photos.");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Could not read photo.")),
        "image/jpeg",
        0.85,
      );
    });
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}
