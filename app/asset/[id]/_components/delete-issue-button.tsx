"use client";

import { useId, useRef, useState, useTransition } from "react";
import { deleteIssue } from "../_lib/delete-issue";

// Delete button on an issue in the history timeline. It opens a confirmation
// dialog; only "Delete issue" in the dialog deletes anything. When the issue
// created a work order, the dialog says the work order and its photos go too.
export function DeleteIssueButton({
  assetId,
  entryId,
  title,
  hasWorkOrder,
}: {
  assetId: string;
  entryId: string;
  title: string;
  hasWorkOrder: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function open() {
    setError("");
    dialogRef.current?.showModal();
  }

  function close() {
    if (!pending) dialogRef.current?.close();
  }

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await deleteIssue(assetId, entryId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      dialogRef.current?.close();
      // The entry, and this button with it, leaves the page; move focus to
      // the history heading so keyboard users are not left nowhere.
      document.getElementById("history-heading")?.focus();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Delete ${title}`}
        className="-my-2 -mr-2 ml-auto inline-flex min-h-11 items-center rounded-md px-3 text-text-muted underline-offset-4 hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-ink"
      >
        Delete
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          // Escape closes the dialog, but not while the delete is running.
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-6 text-text shadow-lg backdrop:bg-ink/50"
      >
        <h2 id={headingId} className="text-lg font-semibold">
          Delete this issue?
        </h2>
        <div id={descriptionId} className="mt-2 space-y-2 text-text-muted">
          <p>
            <span className="font-medium text-text">{title}</span> will be
            removed from the history.
          </p>
          {hasWorkOrder ? (
            <p>Its work order and photos will be deleted too.</p>
          ) : null}
          <p>This cannot be undone.</p>
        </div>
        {error ? (
          <p role="alert" className="mt-4 font-medium text-status-down">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            autoFocus
            className="min-h-11 rounded-md border border-line bg-surface px-5 py-2 font-semibold hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="min-h-11 rounded-md bg-status-down px-5 py-2 font-semibold text-surface hover:bg-status-down/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete issue"}
          </button>
        </div>
      </dialog>
    </>
  );
}
