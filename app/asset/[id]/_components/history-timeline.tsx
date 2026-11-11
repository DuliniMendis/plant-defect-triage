import type { ReactNode } from "react";
import type { HistoryEntry } from "@/db/schema";
import { formatDate, formatHours, kindLabels } from "../_lib/format";
import { WorkOrderPhotos } from "./work-order-photos";

/** Photos for each work order, keyed by work order ID, from getWorkOrderPhotos. */
type PhotosByWorkOrder = Record<string, readonly { id: string; position: number }[]>;

const kindStyles: Record<HistoryEntry["kind"], string> = {
  issue: "border-status-down text-status-down",
  repair: "border-status-ok text-status-ok",
  "schedule-check": "border-line text-text-muted",
  "work-order": "border-accent bg-accent text-accent-ink",
};

const severityStyles: Record<NonNullable<HistoryEntry["severity"]>, string> = {
  low: "text-severity-low",
  medium: "text-severity-medium",
  high: "text-severity-high",
  critical: "text-severity-critical",
};

// History timeline (R6). Entries arrive newest first from `getAssetHistory`;
// this component keeps the order it is given.
export function HistoryTimeline({
  entries,
  photos = {},
}: {
  entries: HistoryEntry[];
  photos?: PhotosByWorkOrder;
}) {
  return (
    <section
      aria-labelledby="history-heading"
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
    >
      <h2 id="history-heading" className="text-lg font-semibold">
        History
      </h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-text-muted">No history recorded yet.</p>
      ) : (
        <ol aria-labelledby="history-heading" className="mt-4 space-y-3">
          {entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              photos={entry.workOrderId ? photos[entry.workOrderId] : undefined}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryItem({
  entry,
  photos,
}: {
  entry: HistoryEntry;
  photos?: PhotosByWorkOrder[string];
}) {
  return (
    <li className="rounded-md border border-line bg-page p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span
          className={`rounded-full border px-2 py-0.5 font-medium ${kindStyles[entry.kind]}`}
        >
          {kindLabels[entry.kind]}
        </span>
        <time dateTime={entry.date} className="text-text-muted">
          {formatDate(entry.date)}
        </time>
        <span className="text-text-muted">
          {entry.status === "open" ? "Open" : "Closed"}
        </span>
      </div>
      <h3 className="mt-2 font-medium">{entry.title}</h3>
      {entry.detail ? (
        <p className="mt-1 text-sm text-text-muted">{entry.detail}</p>
      ) : null}
      {entry.component || entry.severity || entry.meterHours !== null ? (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {entry.component ? (
            <Meta term="Component">{entry.component}</Meta>
          ) : null}
          {entry.severity ? (
            <Meta term="Severity">
              <span
                className={`font-medium capitalize ${severityStyles[entry.severity]}`}
              >
                {entry.severity}
              </span>
            </Meta>
          ) : null}
          {entry.meterHours !== null ? (
            <Meta term="Meter">{formatHours(entry.meterHours)}</Meta>
          ) : null}
        </dl>
      ) : null}
      {photos ? <WorkOrderPhotos photos={photos} title={entry.title} /> : null}
    </li>
  );
}

function Meta({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-text-muted">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
