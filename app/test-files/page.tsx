import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DownloadLink } from "./_components/download-link";
import {
  assetLabel,
  photoUrl,
  qrCodes,
  samplePhotos,
  unknownQrUrl,
} from "./_lib/test-files";

export const metadata: Metadata = { title: "Test files · Plant Defect Triage" };

const textLink =
  "font-medium underline underline-offset-2 hover:decoration-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

// Test files: the sample defect photos and the saved QR codes (R3), offered
// for download so anyone can try the demo without the repository. Nothing here
// reads the database, so the page is prerendered.
export default function TestFilesPage() {
  return (
    <section aria-labelledby="test-files-heading" className="space-y-8">
      <div className="space-y-1">
        <h1 id="test-files-heading" className="text-2xl font-semibold">
          Test files
        </h1>
        <p className="text-text-muted">
          Sample QR codes and defect photos to download and try the demo with.
        </p>
      </div>

      <section
        aria-labelledby="how-heading"
        className="rounded-lg border border-line border-l-4 border-l-accent bg-surface p-5 shadow-sm"
      >
        <h2 id="how-heading" className="text-lg font-semibold">
          How to use them
        </h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Download a QR code and a photo for the same asset from this page.</li>
          <li>
            On the{" "}
            <Link href="/" className={textLink}>
              Fleet
            </Link>{" "}
            page, choose <strong>Upload QR code</strong> and pick the QR code
            image. The asset opens.
          </li>
          <li>
            Under <strong>Report a defect</strong>, choose{" "}
            <strong>Add photos</strong> and pick the photo, write a short note,
            then choose <strong>Draft with AI</strong>.
          </li>
        </ol>
      </section>

      <section aria-labelledby="photos-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="photos-heading" className="text-lg font-semibold">
            Sample defect photos
          </h2>
          <p className="text-sm text-text-muted">
            Each photo goes with one of the four demo assets, which have the
            history the AI checks for repeats. None is a photograph of a real
            machine on a real site.
          </p>
        </div>
        <ul
          aria-labelledby="photos-heading"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {samplePhotos.map((photo) => (
            <li
              key={photo.file}
              className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
            >
              <div className="relative aspect-4/3 bg-surface-raised">
                <Image
                  src={photoUrl(photo.file)}
                  alt={photo.title}
                  fill
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{photo.title}</h3>
                  <p className="text-sm">{photo.shows}</p>
                </div>
                <dl className="space-y-1 text-sm text-text-muted">
                  <div className="flex gap-1">
                    <dt>Use with:</dt>
                    <dd>
                      <Link
                        href={`/asset/${photo.assetId}`}
                        className={`${textLink} text-text`}
                      >
                        {assetLabel(photo.assetId)}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Source:</dt>
                    <dd>{photo.source}</dd>
                  </div>
                </dl>
                <div className="mt-auto">
                  <DownloadLink
                    href={photoUrl(photo.file)}
                    what={`${photo.title} photo`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="qr-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="qr-heading" className="text-lg font-semibold">
            QR codes
          </h2>
          <p className="text-sm text-text-muted">
            One per asset. Each holds only the asset&apos;s ID. The first four
            are the demo assets the photos go with.
          </p>
        </div>
        <ul
          aria-labelledby="qr-heading"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {qrCodes.map((code) => (
            <QrCard
              key={code.assetId}
              url={code.url}
              title={code.assetId}
              isId
              description={code.description}
              alt={`QR code for ${code.assetId}`}
              what={`${code.assetId} QR code`}
            />
          ))}
          <QrCard
            url={unknownQrUrl}
            title="Unknown asset"
            description="A code for an asset that is not in the fleet, to see the “No matching asset” message."
            alt="QR code for an unknown asset"
            what="unknown asset QR code"
          />
        </ul>
      </section>
    </section>
  );
}

function QrCard({
  url,
  title,
  isId = false,
  description,
  alt,
  what,
}: {
  url: string;
  title: string;
  /** Asset IDs are set in the monospace face, as elsewhere in the app. */
  isId?: boolean;
  description: string;
  alt: string;
  what: string;
}) {
  return (
    <li className="flex items-center gap-4 rounded-lg border border-line bg-surface p-3 shadow-sm">
      {/* Already small (about 2 KB), so served as is. */}
      <Image
        src={url}
        alt={alt}
        width={80}
        height={80}
        unoptimized
        className="shrink-0 rounded-sm border border-line"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className={`font-semibold ${isId ? "font-mono" : ""}`}>{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        <DownloadLink href={url} what={what} />
      </div>
    </li>
  );
}
