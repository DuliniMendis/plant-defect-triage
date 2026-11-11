// Photo limits shared by the capture panel and the work order route (R7).

export const MAX_PHOTOS = 3;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Photos are resized in the browser to about 1,500px on the longest side, which
// makes them a few hundred kilobytes. This is a backstop for the server.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
