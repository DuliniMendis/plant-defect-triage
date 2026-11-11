import type { Asset } from "@/db/schema";

type Status = Asset["status"];

const statusStyles: Record<Status, { label: string; dot: string }> = {
  operational: { label: "Operational", dot: "bg-status-ok" },
  "needs-attention": { label: "Needs attention", dot: "bg-status-attention" },
  "out-of-service": { label: "Out of service", dot: "bg-status-down" },
};

// The label is always shown, so status never relies on colour alone.
export function StatusBadge({ status }: { status: Status }) {
  const { label, dot } = statusStyles[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
