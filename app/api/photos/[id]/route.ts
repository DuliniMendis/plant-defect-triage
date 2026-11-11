import { getWorkOrderPhotoPath } from "@/db/work-orders";
import { getPhotoStore } from "@/lib/photo-store";

// GET /api/photos/:id: one work order photo (R28). Photos are kept in a
// private store, so the browser reads them through this route rather than from
// a public URL.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/photos/[id]">,
) {
  const { id } = await params;
  const blobPath = await getWorkOrderPhotoPath(id);
  const photo = blobPath ? await getPhotoStore().get(blobPath) : null;
  if (!photo) {
    return new Response("Photo not found", { status: 404 });
  }

  return new Response(photo.body as BodyInit, {
    headers: {
      "Content-Type": photo.contentType,
      // A stored photo never changes; its ID is new for every upload.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
