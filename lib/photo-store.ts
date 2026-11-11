import { mkdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

// Where work order photos are kept (R28). Server only: the API routes and the
// seed script use it; it is never imported by a browser component. (It does
// not import "server-only", because the seed script runs in plain Node.)
//
// With BLOB_READ_WRITE_TOKEN set, photos go to the project's private Vercel
// Blob store. Without it, for example before Blob is enabled on the project,
// they are written to `.data/photos/` in the project folder, so the flow can be
// built and tested locally. Either way the stored path is what goes in
// `work_order_photos.blob_path`.

export type StoredPhoto = {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
};

export interface PhotoStore {
  readonly kind: "vercel-blob" | "local";
  /** Saves a photo and returns the path to store for it. */
  put(pathname: string, body: Blob, contentType: string): Promise<string>;
  /** The photo at a stored path, or null when there is none. */
  get(pathname: string): Promise<StoredPhoto | null>;
  /** Removes photos. Paths that do not exist are ignored. */
  delete(pathnames: readonly string[]): Promise<void>;
}

export function getPhotoStore(): PhotoStore {
  return process.env.BLOB_READ_WRITE_TOKEN ? vercelBlobStore : localStore();
}

const vercelBlobStore: PhotoStore = {
  kind: "vercel-blob",
  async put(pathname, body, contentType) {
    const result = await put(pathname, body, {
      access: "private",
      contentType,
      addRandomSuffix: false,
    });
    return result.pathname;
  },
  async get(pathname) {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return { body: result.stream, contentType: result.blob.contentType };
  },
  async delete(pathnames) {
    if (pathnames.length > 0) await del([...pathnames]);
  },
};

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function localStore(root = path.join(process.cwd(), ".data", "photos")): PhotoStore {
  // Stored paths come from our own database, but keep every file inside the
  // folder regardless.
  function resolve(pathname: string) {
    const file = path.resolve(root, pathname);
    if (!file.startsWith(root + path.sep)) {
      throw new Error(`Photo path is outside the photo folder: ${pathname}`);
    }
    return file;
  }

  return {
    kind: "local",
    async put(pathname, body) {
      const file = resolve(pathname);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, new Uint8Array(await body.arrayBuffer()), {
        flag: "wx",
      });
      return pathname;
    },
    async get(pathname) {
      try {
        const body = await readFile(resolve(pathname));
        const contentType =
          contentTypes[path.extname(pathname).toLowerCase()] ??
          "application/octet-stream";
        return { body: new Uint8Array(body), contentType };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(pathnames) {
      await Promise.all(
        pathnames.map(async (p) => {
          const file = resolve(p);
          await rm(file, { force: true });
          // Remove the work order's folder too once it is empty.
          await rmdir(path.dirname(file)).catch(() => {});
        }),
      );
    },
  };
}
