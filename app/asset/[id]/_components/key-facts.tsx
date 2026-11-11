import type { Asset } from "@/db/schema";
import { describeServiceDue, formatHours, statusLabels } from "../_lib/format";

const statusStyles: Record<Asset["status"], string> = {
  operational: "border-status-ok text-status-ok",
  "needs-attention": "border-status-attention text-status-attention",
  "out-of-service": "border-status-down text-status-down",
};

// Key facts panel (R5): make, model, site, meter hours, next service due and
// current status.
export function KeyFacts({ asset }: { asset: Asset }) {
  const serviceDue = describeServiceDue(
    asset.meterHours,
    asset.nextServiceDueHours,
  );

  const facts = [
    { term: "Make", value: asset.make },
    { term: "Model", value: asset.model },
    { term: "Site", value: asset.site },
    { term: "Meter hours", value: formatHours(asset.meterHours) },
    {
      term: "Next service due",
      value: (
        <span className={serviceDue.overdue ? "text-status-down" : undefined}>
          {serviceDue.text}
        </span>
      ),
    },
    {
      term: "Status",
      value: (
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-sm font-medium ${statusStyles[asset.status]}`}
        >
          {statusLabels[asset.status]}
        </span>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="key-facts-heading"
      className="rounded-lg border border-line bg-surface p-5"
    >
      <h2 id="key-facts-heading" className="text-lg font-semibold">
        Key facts
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {facts.map(({ term, value }) => (
          <div key={term}>
            <dt className="text-sm text-text-muted">{term}</dt>
            <dd className="mt-1">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
