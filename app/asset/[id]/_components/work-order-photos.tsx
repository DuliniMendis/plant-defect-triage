import Image from "next/image";

// The photos saved with a work order (R24, R28), shown on its history entry.
// Photos live in a private store, so they are read through /api/photos/:id.
export function WorkOrderPhotos({
  photos,
  title,
}: {
  photos: readonly { id: string; position: number }[];
  /** The work order's title, used to name the photos. */
  title: string;
}) {
  if (photos.length === 0) return null;
  return (
    <ul aria-label={`Photos for ${title}`} className="mt-3 flex flex-wrap gap-2">
      {photos.map((photo) => (
        <li key={photo.id} className="w-28 overflow-hidden rounded border border-line">
          <a
            href={`/api/photos/${photo.id}`}
            target="_blank"
            rel="noreferrer"
            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Image
              src={`/api/photos/${photo.id}`}
              alt={`Photo ${photo.position} for ${title}`}
              width={224}
              height={168}
              unoptimized
              className="aspect-4/3 w-full object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
