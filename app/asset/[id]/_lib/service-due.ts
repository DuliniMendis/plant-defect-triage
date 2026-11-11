import { formatHours } from "./format";

/**
 * Typical hours between scheduled services. The colour of the service gauge
 * comes from the hours left as a share of this interval. The data model stores
 * only the meter reading the next service is due at, not each asset's
 * interval; the seeded fleet services on 250 and 500 hour marks, so 500 h is
 * the common interval.
 */
export const SERVICE_INTERVAL_HOURS = 500;

/** How close the next service is, from plenty of hours left to due. */
export type ServiceLevel = "good" | "fair" | "low" | "due";

export type ServiceDue = {
  /** "At 4,500 h (285 h to go)", "Due now at 4,500 h", "Overdue by 120 h (due at 4,500 h)" */
  text: string;
  overdue: boolean;
  /** Hours left before the service, never below 0. */
  hoursLeft: number;
  /**
   * How far the meter has run towards the due reading, from 0 (no hours) to
   * 1 (due or overdue). The gauge fills up as the service gets closer.
   */
  progress: number;
  level: ServiceLevel;
};

// Thresholds on the hours left as a share of the interval: more than half is
// good, a quarter to a half is fair, a tenth to a quarter is low, and a tenth
// or less (or overdue) is due.
function levelFor(hoursLeft: number): ServiceLevel {
  const share = hoursLeft / SERVICE_INTERVAL_HOURS;
  if (share > 0.5) return "good";
  if (share > 0.25) return "fair";
  if (share > 0.1) return "low";
  return "due";
}

/** When the next service falls due, and how close it is. */
export function describeServiceDue(
  meterHours: number,
  nextServiceDueHours: number,
): ServiceDue {
  const remaining = nextServiceDueHours - meterHours;
  const dueAt = formatHours(nextServiceDueHours);
  const hoursLeft = Math.max(remaining, 0);
  const progress =
    nextServiceDueHours > 0
      ? Math.min(Math.max(meterHours / nextServiceDueHours, 0), 1)
      : 1;

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
    progress,
    level: levelFor(hoursLeft),
  };
}
