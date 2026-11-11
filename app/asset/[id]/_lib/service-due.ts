import { formatHours } from "./format";

/**
 * Hours between scheduled services, used as the full scale of the service
 * gauge. The data model stores only the meter reading the next service is due
 * at, not each asset's interval; the seeded fleet services on 250 and 500 hour
 * marks, so 500 h is the common interval.
 */
export const SERVICE_INTERVAL_HOURS = 500;

/** How close the next service is, from plenty of hours left to due. */
export type ServiceLevel = "good" | "fair" | "low" | "due";

export type ServiceDue = {
  /** "At 4,500 h (285 h to go)", "Due now at 4,500 h", "Overdue by 120 h (due at 4,500 h)" */
  text: string;
  overdue: boolean;
  /** Hours left before the service, never below 0 or above the interval. */
  hoursLeft: number;
  /** Share of the interval left, from 0 to 1. */
  fraction: number;
  level: ServiceLevel;
};

// Thresholds on the share of the interval left: more than half is good, a
// quarter to a half is fair, a tenth to a quarter is low, and a tenth or less
// (or overdue) is due.
function levelFor(fraction: number): ServiceLevel {
  if (fraction > 0.5) return "good";
  if (fraction > 0.25) return "fair";
  if (fraction > 0.1) return "low";
  return "due";
}

/** When the next service falls due, and how close it is. */
export function describeServiceDue(
  meterHours: number,
  nextServiceDueHours: number,
): ServiceDue {
  const remaining = nextServiceDueHours - meterHours;
  const dueAt = formatHours(nextServiceDueHours);
  const hoursLeft = Math.min(Math.max(remaining, 0), SERVICE_INTERVAL_HOURS);
  const fraction = hoursLeft / SERVICE_INTERVAL_HOURS;

  let text: string;
  if (remaining > 0) {
    text = `At ${dueAt} (${formatHours(remaining)} to go)`;
  } else if (remaining === 0) {
    text = `Due now at ${dueAt}`;
  } else {
    text = `Overdue by ${formatHours(-remaining)} (due at ${dueAt})`;
  }

  return {
    text,
    overdue: remaining <= 0,
    hoursLeft,
    fraction,
    level: levelFor(fraction),
  };
}
