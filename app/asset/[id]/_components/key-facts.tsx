import { StatusBadge } from "@/components/status-badge";
import type { Asset } from "@/db/schema";
import { formatHours } from "../_lib/format";
import { describeServiceDue } from "../_lib/service-due";
import { ServiceGauge } from "./service-gauge";

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
        <div className="space-y-2">
          <p
            className={
              serviceDue.overdue ? "font-medium text-status-down" : undefined
            }
          >
            {serviceDue.text}
          </p>
          <ServiceGauge serviceDue={serviceDue} />
        </div>
      ),
    },
    { term: "Status", value: <StatusBadge status={asset.status} /> },
  ];

  return (
    <section
      aria-labelledby="key-facts-heading"
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
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
