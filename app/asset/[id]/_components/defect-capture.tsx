"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { submitWorkOrder } from "../_lib/submit-work-order";
import { blankValues, type FormValues } from "../_lib/work-order-form";
import { WorkOrderForm } from "./work-order-form";
import { blankDraft, type TriageDraft } from "@/lib/schema";

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

type Step =
  | { name: "capture"; message?: string }
  | { name: "review" }
  | { name: "saved"; title: string };

// Defect capture (R7, R9, R10): up to 3 photos by file picker or drag and
// drop, with a preview and remove button for each, and a notes box. Voice
// dictation (milestone 5) will write into the same notes box. "Continue" opens
// the issue and work order form (R20); Approve saves it with the photos
// (R21, R24 to R28) and Discard throws the whole report away.
export function DefectCapture({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>({ name: "capture" });
  const [values, setValues] = useState<FormValues>(blankValues);
  // A manual entry starts from a blank draft. In milestone 6 this becomes the
  // AI's draft, with its model, so the changed fields can be worked out.
  const [base] = useState<TriageDraft>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      setError("");
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
    if (!canContinue(photos.length, notes)) {
      setError("Add at least one photo or type some notes before continuing.");
      return;
    }
    setError("");
    setStep({ name: "review" });
  }

  /** Clears the report and form, ready for the next defect. */
  function reset(next: Step) {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setNotes("");
    setPhotoMessage("");
    setValues(blankValues());
    setSaveError("");
    setStep(next);
  }

  async function approve(final: TriageDraft) {
    setSaving(true);
    setSaveError("");
    const result = await submitWorkOrder({
      assetId,
      notes: notes.trim(),
      final,
      photos: photos.map((p) => p.blob),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    reset({ name: "saved", title: final.workOrder.title });
    // Re-render the server parts of the page: history and status (R24, R25).
    router.refresh();
  }

  if (step.name === "review") {
    return (
      <WorkOrderForm
        values={values}
        onChange={setValues}
        base={base}
        photos={photos}
        notes={notes}
        saving={saving}
        saveError={saveError}
        onApprove={(draft) => void approve(draft)}
        onDiscard={() =>
          reset({ name: "capture", message: "Report discarded. Nothing was saved." })
        }
        onEditReport={() => setStep({ name: "capture" })}
      />
    );
  }

  if (step.name === "saved") {
    return (
      <WorkOrderSaved
        title={step.title}
        onAnother={() => setStep({ name: "capture" })}
      />
    );
  }

  return (
    <section
      aria-labelledby="defect-capture-heading"
      className="rounded-lg border border-accent bg-surface p-5"
    >
      <h2 id="defect-capture-heading" className="text-lg font-semibold">
        Report a defect
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Add up to {MAX_PHOTOS} photos, type notes, or both.
      </p>
      {step.message && (
        <p role="status" className="mt-3 rounded-md border border-line bg-surface-raised px-3 py-2 text-sm">
          {step.message}
        </p>
      )}

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
          <legend className="text-sm font-semibold">Photos</legend>

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
              } peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-text`}
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
                  className="overflow-hidden rounded-md border border-line bg-surface-raised"
                >
                  <Image
                    src={photo.url}
                    alt={`Photo ${index + 1}: ${photo.name}`}
                    width={photo.width}
                    height={photo.height}
                    unoptimized
                    className="aspect-4/3 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-2">
                    <span className="truncate text-xs text-text-muted" title={photo.name}>
                      {photo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removePhoto(photo.id);
                        inputRef.current?.focus();
                      }}
                      aria-label={`Remove photo ${index + 1}, ${photo.name}`}
                      className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-text underline decoration-accent decoration-2 underline-offset-2 hover:bg-surface"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div>
          <label htmlFor={notesId} className="text-sm font-semibold">
            Notes
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            rows={5}
            placeholder="What did you see, hear or smell? Where on the machine? When did it start?"
            className="mt-2 block w-full rounded-md border border-line bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-2 focus:outline-accent"
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
          className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue
        </button>
      </form>
    </section>
  );
}

function noopSubscribe() {
  return () => {};
}

function WorkOrderSaved({
  title,
  onAnother,
}: {
  title: string;
  onAnother: () => void;
}) {
  return (
    <section
      aria-labelledby="work-order-saved-heading"
      className="rounded-lg border border-accent bg-surface p-5"
    >
      <h2 id="work-order-saved-heading" className="text-lg font-semibold">
        Work order saved
      </h2>
      <p role="status" className="mt-2 text-sm">
        &ldquo;{title}&rdquo; is now on the asset&apos;s history.
      </p>
      <button
        type="button"
        onClick={onAnother}
        className="mt-4 min-h-11 rounded-md border border-line bg-surface-raised px-4 py-2 text-sm font-semibold text-text hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Report another defect
      </button>
    </section>
  );
}
