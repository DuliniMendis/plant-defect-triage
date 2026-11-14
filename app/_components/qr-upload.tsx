"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { lookUpQrFile, type QrLookup } from "../_lib/qr-code";

type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | Exclude<QrLookup, { kind: "found" }>;

// True once React has hydrated; false in the server render.
const noSubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(noSubscribe, () => true, () => false);

// Codes longer than this are cut short in the "no matching asset" message.
const maxShownCode = 40;

// "Upload QR code" on the fleet page (R2). The image is read in the browser;
// a code that matches an asset opens its profile. Anything else says what went
// wrong and offers the list (R4) instead.
export function QrUpload({
  knownIds,
  onPickFromList,
  lookUp = lookUpQrFile,
}: {
  knownIds: string[];
  onPickFromList: () => void;
  /** Replaced in tests, where jsdom has no canvas to read images with. */
  lookUp?: (file: File, knownIds: string[]) => Promise<QrLookup>;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  // The asset being opened. Shown only while the navigation is pending, so the
  // control is ready again if the user comes back to this page.
  const [openingId, setOpeningId] = useState("");
  const [opening, startOpening] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  // Disabled until hydrated, so a file chosen before then is not ignored.
  const hydrated = useHydrated();
  const busy = !hydrated || state.kind === "reading" || opening;

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still triggers a read.
    event.target.value = "";
    if (!file) return;

    setState({ kind: "reading" });
    let result: QrLookup;
    try {
      result = await lookUp(file, knownIds);
    } catch {
      result = { kind: "no-code" };
    }

    if (result.kind === "found") {
      const assetId = result.assetId;
      setState({ kind: "idle" });
      setOpeningId(assetId);
      // Only IDs from the fleet reach here, never the raw code text.
      startOpening(() => router.push(`/asset/${encodeURIComponent(assetId)}`));
    } else {
      setState(result);
    }
  }

  function pickFromList() {
    setState({ kind: "idle" });
    onPickFromList();
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Have the asset&apos;s QR code?</p>
          <p id={`${id}-hint`} className="text-sm text-text-muted">
            Upload a saved image of it to open the asset.
          </p>
          <p className="text-sm text-text-muted">
            No QR code to hand?{" "}
            <Link
              href="/test-files"
              className="font-medium text-text underline underline-offset-2 hover:decoration-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Download a test QR code
            </Link>
            .
          </p>
        </div>
        <label
          aria-disabled={busy || undefined}
          className="inline-flex h-10 cursor-pointer items-center rounded-md bg-ink px-4 text-sm font-semibold text-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink aria-disabled:cursor-wait aria-disabled:opacity-60"
        >
          {state.kind === "reading"
            ? "Reading QR code…"
            : opening
              ? `Opening ${openingId}…`
              : "Upload QR code"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label="Upload QR code"
            aria-describedby={`${id}-hint`}
            disabled={busy}
            onChange={handleChange}
            className="sr-only"
          />
        </label>
      </div>

      {state.kind === "no-code" ||
      state.kind === "unknown" ||
      state.kind === "not-image" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line border-l-4 border-l-status-down bg-surface-raised px-4 py-3 text-sm"
        >
          <p>
            <QrMessage state={state} />
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Try another image
            </button>
            <button
              type="button"
              onClick={pickFromList}
              className="rounded-md bg-ink px-3 py-1.5 font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Pick from the list
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QrMessage({ state }: { state: Exclude<QrLookup, { kind: "found" }> }) {
  switch (state.kind) {
    case "no-code":
      return (
        <>
          <strong>No QR code found.</strong> This image has no QR code that can
          be read. Try a clearer image, or pick the asset from the list.
        </>
      );
    case "not-image":
      return (
        <>
          <strong>Not an image.</strong> Choose a PNG or JPEG image of the QR
          code, or pick the asset from the list.
        </>
      );
    case "unknown": {
      const shown =
        state.code.length > maxShownCode
          ? `${state.code.slice(0, maxShownCode)}…`
          : state.code;
      return (
        <>
          <strong>No matching asset.</strong> The QR code reads{" "}
          <code className="font-mono">{shown}</code>, which is not an asset in
          this fleet. Pick the asset from the list instead.
        </>
      );
    }
  }
}
