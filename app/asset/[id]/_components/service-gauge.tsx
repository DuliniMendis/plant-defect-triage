import {
  SERVICE_INTERVAL_HOURS,
  type ServiceDue,
  type ServiceLevel,
} from "../_lib/service-due";

const fills: Record<ServiceLevel, string> = {
  good: "bg-service-good",
  fair: "bg-service-fair",
  low: "bg-service-low",
  due: "bg-service-due",
};

// A horizontal battery showing how much of the service interval is left: full
// and green just after a service, emptying through yellow and orange to red as
// the service falls due. The hours are shown as text beside it, so the colour
// is never the only signal.
export function ServiceGauge({ serviceDue }: { serviceDue: ServiceDue }) {
  const { hoursLeft, fraction, level, overdue } = serviceDue;

  return (
    <div
      role="meter"
      aria-label="Hours left before the next service"
      aria-valuemin={0}
      aria-valuemax={SERVICE_INTERVAL_HOURS}
      aria-valuenow={hoursLeft}
      aria-valuetext={overdue ? "Service due" : `${hoursLeft} h to go`}
      className="flex items-center"
    >
      <div
        className={`h-4 w-40 rounded-sm border-2 bg-surface p-0.5 ${
          overdue ? "border-service-due" : "border-text-muted"
        }`}
      >
        <div
          className={`h-full rounded-[1px] ${fills[level]}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className={`h-2 w-1 rounded-r-sm ${
          overdue ? "bg-service-due" : "bg-text-muted"
        }`}
      />
    </div>
  );
}
