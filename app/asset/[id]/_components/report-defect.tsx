// "Report a defect" entry point. The photo and notes capture panel replaces
// this placeholder in milestone 3 (R7 to R10).
export function ReportDefect() {
  return (
    <section
      aria-labelledby="report-defect-heading"
      className="rounded-lg border border-accent bg-surface p-5"
    >
      <h2 id="report-defect-heading" className="text-lg font-semibold">
        Report a defect
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Add photos and notes about a fault, then review an AI-drafted issue and
        work order.
      </p>
      <button
        type="button"
        disabled
        aria-describedby="report-defect-note"
        className="mt-4 rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        Report a defect
      </button>
      <p id="report-defect-note" className="mt-2 text-xs text-text-muted">
        Defect capture is not built yet.
      </p>
    </section>
  );
}
