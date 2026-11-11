// Rules for the defect capture panel (R7, R10). Pure functions, so they can be
// unit tested without a browser.

export const MAX_PHOTOS = 3;

// Photos are resized in the browser to about this many pixels on the longest
// side before they are sent anywhere (technical plan v2, section 5).
export const MAX_LONG_SIDE = 1500;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type RejectedPhoto = {
  name: string;
  reason: "not-an-image" | "too-many";
};

/**
 * Splits newly picked or dropped files into the ones to add and the ones to
 * refuse, given how many photos are already in the panel.
 */
export function selectPhotos(
  existingCount: number,
  files: readonly File[],
): { accepted: File[]; rejected: RejectedPhoto[] } {
  const accepted: File[] = [];
  const rejected: RejectedPhoto[] = [];
  let room = Math.max(0, MAX_PHOTOS - existingCount);

  for (const file of files) {
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      rejected.push({ name: file.name, reason: "not-an-image" });
    } else if (room === 0) {
      rejected.push({ name: file.name, reason: "too-many" });
    } else {
      accepted.push(file);
      room -= 1;
    }
  }

  return { accepted, rejected };
}

/** A plain message for the files that were not added. */
export function describeRejections(rejected: readonly RejectedPhoto[]): string {
  const messages: string[] = [];
  const notImages = rejected.filter((r) => r.reason === "not-an-image");
  const tooMany = rejected.filter((r) => r.reason === "too-many");

  if (notImages.length > 0) {
    messages.push(
      `${listNames(notImages)} ${notImages.length === 1 ? "is not a" : "are not"} JPEG, PNG or WebP ${notImages.length === 1 ? "image" : "images"}.`,
    );
  }
  if (tooMany.length > 0) {
    messages.push(
      `You can add up to ${MAX_PHOTOS} photos, so ${listNames(tooMany)} ${tooMany.length === 1 ? "was" : "were"} not added.`,
    );
  }
  return messages.join(" ");
}

function listNames(rejected: readonly RejectedPhoto[]): string {
  return rejected.map((r) => r.name).join(", ");
}

/**
 * The size to draw an image at so its longest side is at most `max`, keeping
 * its shape. Images already small enough keep their size.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_LONG_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) {
    return { width, height };
  }
  const scale = max / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** R10: at least one photo or some notes. Whitespace alone is not notes. */
export function canContinue(photoCount: number, notes: string): boolean {
  return photoCount > 0 || notes.trim().length > 0;
}
