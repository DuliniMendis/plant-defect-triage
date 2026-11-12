// Number formats for the Insights page. A missing figure shows as an en dash.

const DASH = "–";

export function formatUsd(value: number | null): string {
  if (value === null) return DASH;
  // Drafts cost fractions of a cent, so small amounts keep more places.
  const digits = value !== 0 && Math.abs(value) < 0.1 ? 4 : 2;
  return `$${value.toFixed(digits)}`;
}

export function formatSeconds(ms: number | null): string {
  return ms === null ? DASH : `${(ms / 1000).toFixed(1)} s`;
}

export function formatPercent(share: number | null): string {
  return share === null ? DASH : `${Math.round(share * 100)}%`;
}

export function formatCount(value: number | null, digits = 0): string {
  return value === null
    ? DASH
    : value.toLocaleString("en-AU", { maximumFractionDigits: digits });
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-AU")} ${count === 1 ? one : many}`;
}
