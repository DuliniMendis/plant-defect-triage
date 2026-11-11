import type { Asset, HistoryEntry } from "@/db/schema";

// Display text for the asset profile.

const numberFormat = new Intl.NumberFormat("en-AU");

// Dates are stored without a time, so format them in UTC to avoid a timezone
// shifting the day.
const dateFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const statusLabels: Record<Asset["status"], string> = {
  operational: "Operational",
  "needs-attention": "Needs attention",
  "out-of-service": "Out of service",
};

export const kindLabels: Record<HistoryEntry["kind"], string> = {
  issue: "Issue",
  repair: "Repair",
  "schedule-check": "Schedule check",
  "work-order": "Work order",
};

/** "1,234 h" */
export function formatHours(hours: number): string {
  return `${numberFormat.format(hours)} h`;
}

/** "2026-03-14" → "14 Mar 2026" */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * When the next service falls due, from the meter reading it is due at.
 * "At 4,500 h, 250 h to go", "Due now at 4,500 h" or "Overdue by 120 h".
 */
export function describeServiceDue(
  meterHours: number,
  nextServiceDueHours: number,
): { text: string; overdue: boolean } {
  const remaining = nextServiceDueHours - meterHours;
  if (remaining > 0) {
    return {
      text: `At ${formatHours(nextServiceDueHours)}, ${formatHours(remaining)} to go`,
      overdue: false,
    };
  }
  if (remaining === 0) {
    return {
      text: `Due now at ${formatHours(nextServiceDueHours)}`,
      overdue: true,
    };
  }
  return { text: `Overdue by ${formatHours(-remaining)}`, overdue: true };
}
