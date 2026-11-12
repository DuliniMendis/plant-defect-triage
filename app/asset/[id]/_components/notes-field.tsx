"use client";

import { UNSUPPORTED_MESSAGE, useDictation } from "../_lib/use-dictation";
import { RequiredMark } from "./required-mark";

// The required notes box (R9, R10) with voice dictation (R8). Typed and
// dictated notes share the one box: each phrase the browser settles on is
// added to the end, and the person can correct it by typing at any time, even
// while still dictating.
export function NotesField({
  id,
  value,
  onChange,
  onDictate,
  invalid,
  errorId,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Called with each dictated phrase, to be added to the end of the notes. */
  onDictate: (words: string) => void;
  /** Continue was pressed with no notes: the title and box turn red. */
  invalid: boolean;
  /** The message explaining why the notes are invalid. */
  errorId: string;
}) {
  const { supported, status, interim, message, start, stop } =
    useDictation(onDictate);
  const active = status !== "idle";
  const statusId = `${id}-dictation`;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label
          htmlFor={id}
          className={`text-sm font-semibold ${invalid ? "text-status-down" : ""}`}
        >
          Notes <RequiredMark />
        </label>
        {/* Shown in every browser; where there is no dictation it stays
            disabled and the status line says why. */}
        <button
          type="button"
          onClick={active ? stop : start}
          disabled={supported !== true}
          aria-describedby={statusId}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 ${
            active
              ? "border-ink bg-ink text-surface hover:bg-ink/85"
              : "border-line bg-surface-raised text-text enabled:hover:border-accent"
          }`}
        >
          {active ? <StopIcon /> : <MicIcon />}
          {active ? "Stop dictating" : "Dictate"}
        </button>
      </div>

      <textarea
        id={id}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="Type or dictate. What did you see, hear or smell? Where on the machine? When did it start?"
        className={`mt-2 block w-full rounded-md border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-ink focus-visible:outline-2 focus-visible:outline-ink aria-invalid:border-status-down ${
          active ? "border-accent ring-2 ring-accent" : "border-line"
        }`}
      />

      {/* Status for screen readers and sighted users alike. Interim words
          change too often to announce, so they sit outside the live region. */}
      <p
        id={statusId}
        aria-live="polite"
        className="mt-2 flex items-center gap-2 text-sm text-text-muted empty:hidden"
      >
        {supported === false ? (
          UNSUPPORTED_MESSAGE
        ) : status === "starting" ? (
          "Starting the microphone…"
        ) : status === "listening" ? (
          <>
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 animate-pulse rounded-full bg-accent ring-2 ring-ink"
            />
            <span className="font-semibold text-text">
              Listening. Speak now, then press Stop dictating.
            </span>
          </>
        ) : (
          message
        )}
      </p>
      {active && interim ? (
        <p className="mt-1 text-sm italic text-text-muted">{interim}…</p>
      ) : null}
    </div>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path d="M10 2a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M5 9.5a.75.75 0 0 0-1.5 0 6.5 6.5 0 0 0 5.75 6.46V18a.75.75 0 0 0 1.5 0v-2.04A6.5 6.5 0 0 0 16.5 9.5a.75.75 0 0 0-1.5 0 5 5 0 0 1-10 0Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
    </svg>
  );
}
