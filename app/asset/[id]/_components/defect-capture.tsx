"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ACCEPTED_TYPES,
  canContinue,
  describeRejections,
  MAX_PHOTOS,
  selectPhotos,
} from "../_lib/capture";
import { resizePhoto } from "../_lib/resize-photo";

export type CapturedPhoto = {
  id: number;
  name: string;
  /** Object URL for the preview. Revoked when the photo is removed. */
  url: string;
  /** Resized JPEG, ready to send for triage and storage. */
  blob: Blob;
  width: number;
  height: number;
};

// Defect capture (R7, R9, R10): a required notes box and up to 3 optional
// photos by file picker or drag and drop, with a preview and remove button
// for each. Voice dictation (milestone 5) will write into the same notes box.
// "Continue" leads to the issue and work order form in milestone 4.
export function DefectCapture() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const nextId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const notesId = `${formId}-notes`;
  const errorId = `${formId}-error`;

  // Revoke any preview URLs still held when the panel goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  );

  const full = photos.length >= MAX_PHOTOS;
  // Controls stay disabled until React has hydrated, so a photo picked or a
  // click made before then is not lost to a plain HTML form submit.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const photosLocked = full || busy || !hydrated;
  // Set when Continue is pressed without notes; cleared as soon as some are
  // typed. Turns the Notes title and box red.
  const missing = error !== "";

  async function addFiles(files: readonly File[]) {
    if (busy || files.length === 0) return;
    const { accepted, rejected } = selectPhotos(photos.length, files);
    const messages = [describeRejections(rejected)];

    setBusy(true);
    // Resize in parallel; keep the order the files were picked in.
    const results = await Promise.allSettled(accepted.map(resizePhoto));
    const added: CapturedPhoto[] = [];
    results.forEach((result, index) => {
      const file = accepted[index];
      if (result.status === "fulfilled") {
        added.push({
          id: nextId.current++,
          name: file.name,
          url: URL.createObjectURL(result.value.blob),
          ...result.value,
        });
      } else {
        messages.push(`Could not read ${file.name}.`);
      }
    });
    setBusy(false);

    if (added.length > 0) {
      setPhotos((current) => [...current, ...added]);
    }
    setPhotoMessage(messages.filter(Boolean).join(" "));
  }

  function removePhoto(id: number) {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhotos((current) => current.filter((p) => p.id !== id));
    setPhotoMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue(notes)) {
      setError("Type some notes about the defect before continuing.");
      return;
    }
    setError("");
    setReady(true);
  }

  if (ready) {
    return (
      <CaptureSummary
        photoCount={photos.length}
        hasNotes={notes.trim().length > 0}
        onEdit={() => setReady(false)}
      />
    );
  }

  return (
    <section
      aria-labelledby="defect-capture-heading"
      className="rounded-lg border border-line border-t-4 border-t-accent bg-surface p-5 shadow-sm"
    >
      <h2 id="defect-capture-heading" className="text-lg font-semibold">
        Report a defect
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Describe the defect in the notes, and add up to {MAX_PHOTOS} photos if
        you have them.{" "}
        <span className="whitespace-nowrap">
          <RequiredMark /> Required
        </span>
      </p>

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-describedby={error ? errorId : undefined}
        className="mt-4 space-y-5"
      >
        <fieldset
          onDragEnter={(e) => {
            e.preventDefault();
            if (!photosLocked) setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = photosLocked ? "none" : "copy";
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!photosLocked) void addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <legend className="text-sm font-semibold">
            Photos{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </legend>

          <div
            className={`mt-2 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
              dragging
                ? "border-accent bg-surface"
                : "border-line bg-surface-raised"
            }`}
          >
            <input
              ref={inputRef}
              id={`${formId}-photos`}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple
              disabled={photosLocked}
              className="peer sr-only"
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = "";
                void addFiles(files);
              }}
            />
            <label
              htmlFor={`${formId}-photos`}
              className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                photosLocked
                  ? "cursor-not-allowed border-line text-text-muted"
                  : "cursor-pointer border-line bg-surface text-text hover:border-accent"
              } peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink`}
            >
              Add photos
            </label>
            <p className="text-xs text-text-muted">
              {full
                ? `${MAX_PHOTOS} of ${MAX_PHOTOS} photos added. Remove one to add another.`
                : "or drag and drop JPEG, PNG or WebP images here"}
            </p>
          </div>

          <p aria-live="polite" className="mt-2 text-sm text-text-muted empty:hidden">
            {busy ? "Preparing photos…" : photoMessage}
          </p>

          {photos.length > 0 && (
            <ul aria-label="Added photos" className="mt-3 grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <li
                  key={photo.id}
                  className="relative overflow-hidden rounded-md border border-line bg-surface-raised"
                >
                  <Image
                    src={photo.url}
                    alt={`Photo ${index + 1}: ${photo.name}`}
                    width={photo.width}
                    height={photo.height}
                    unoptimized
                    className="aspect-4/3 w-full object-cover"
                  />
                  <p className="truncate p-2 text-xs text-text-muted" title={photo.name}>
                    {photo.name}
                  </p>
                  {/* Round black button over the photo's corner; the white
                      ring keeps the focus outline visible on any photo. */}
                  <button
                    type="button"
                    onClick={() => {
                      removePhoto(photo.id);
                      inputRef.current?.focus();
                    }}
                    aria-label={`Remove photo ${index + 1}, ${photo.name}`}
                    title="Remove photo"
                    className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-ink/80 text-surface shadow-sm hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink focus-visible:ring-2 focus-visible:ring-surface"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div>
          <label
            htmlFor={notesId}
            className={`text-sm font-semibold ${missing ? "text-status-down" : ""}`}
          >
            Notes <RequiredMark />
          </label>
          <textarea
            id={notesId}
            aria-required="true"
            aria-invalid={missing || undefined}
            aria-describedby={missing ? errorId : undefined}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            rows={5}
            placeholder="What did you see, hear or smell? Where on the machine? When did it start?"
            className="mt-2 block w-full rounded-md border border-line bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-ink focus-visible:outline-2 focus-visible:outline-ink aria-invalid:border-status-down"
          />
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-sm font-semibold text-status-down">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !hydrated}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </form>
    </section>
  );
}

// Red asterisk for a required field. Hidden from screen readers, which hear
// the field as required (aria-required) instead.
function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-status-down">
      *
    </span>
  );
}

function noopSubscribe() {
  return () => {};
}

function CaptureSummary({
  photoCount,
  hasNotes,
  onEdit,
}: {
  photoCount: number;
  hasNotes: boolean;
  onEdit: () => void;
}) {
  const parts = [
    hasNotes && "notes",
    photoCount > 0 && `${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="defect-capture-heading"
      className="rounded-lg border border-line border-t-4 border-t-accent bg-surface p-5 shadow-sm"
    >
      <h2 id="defect-capture-heading" className="text-lg font-semibold">
        Defect report ready
      </h2>
      <p role="status" className="mt-2 text-sm">
        Captured {parts.join(" and ")}.
      </p>
      <p className="mt-1 text-sm text-text-muted">
        The issue and work order form comes in milestone 4.
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="mt-4 rounded-md border border-line bg-surface-raised px-4 py-2 text-sm font-semibold text-text hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Edit report
      </button>
    </section>
  );
}
