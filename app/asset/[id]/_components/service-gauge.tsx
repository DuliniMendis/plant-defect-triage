import type { ServiceDue, ServiceLevel } from "../_lib/service-due";

// Static class names per level, so Tailwind can see them.
const styles: Record<
  ServiceLevel,
  { track: string; fill: string; badge: string }
> = {
  good: {
    track: "border-service-good",
    fill: "from-service-good/45 to-service-good",
    badge: "from-service-good/60 to-service-good",
  },
  fair: {
    track: "border-service-fair",
    fill: "from-service-fair/45 to-service-fair",
    badge: "from-service-fair/60 to-service-fair",
  },
  low: {
    track: "border-service-low",
    fill: "from-service-low/45 to-service-low",
    badge: "from-service-low/60 to-service-low",
  },
  due: {
    track: "border-service-due",
    fill: "from-service-due/45 to-service-due",
    badge: "from-service-due/60 to-service-due",
  },
};

// Progress towards the next service: a pill that fills up as the meter nears
// the due reading, coloured by how many hours are left (green with plenty,
// through yellow and orange, to red when due). The percentage sits in a badge
// beside it and the hours are shown as text above, so colour is never the
// only signal.
export function ServiceGauge({
  meterHours,
  nextServiceDueHours,
  serviceDue,
}: {
  meterHours: number;
  nextServiceDueHours: number;
  serviceDue: ServiceDue;
}) {
  const { progress, level, overdue, hoursLeft } = serviceDue;
  const percent = progress >= 1 ? 100 : Math.floor(progress * 100);
  const style = styles[level];

  return (
    <div
      role="meter"
      aria-label="Progress to the next service"
      aria-valuemin={0}
      aria-valuemax={nextServiceDueHours}
      aria-valuenow={Math.min(meterHours, nextServiceDueHours)}
      aria-valuetext={
        overdue ? "Service due" : `${percent}%, ${hoursLeft} h to go`
      }
      className="flex max-w-72 items-center gap-3"
    >
      <div
        className={`h-5 flex-1 rounded-full border-2 bg-surface-raised p-0.5 ${style.track}`}
      >
        <div
          className={`h-full rounded-full bg-linear-to-r ${style.fill}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br text-xs font-bold text-ink ${style.badge}`}
      >
        {percent}%
      </span>
    </div>
  );
}
