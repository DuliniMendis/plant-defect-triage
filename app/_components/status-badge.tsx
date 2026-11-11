import type { Asset } from "@/db/schema";

export type Status = Asset["status"];

export const statusLabels: Record<Status, string> = {
  operational: "Operational",
  "needs-attention": "Needs attention",
  "out-of-service": "Out of service",
};

const statusDots: Record<Status, string> = {
  operational: "bg-status-ok",
  "needs-attention": "bg-status-attention",
  "out-of-service": "bg-status-down",
};

// The label is always shown, so status never relies on colour alone.
export function StatusBadge({ status }: { status: Status }) {
  const label = statusLabels[status];
  const dot = statusDots[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
