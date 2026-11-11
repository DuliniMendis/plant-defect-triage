import type { Asset } from "@/db/schema";

// Search and filters for the fleet screen. Pure functions, shared by the
// server (reading the URL) and the browser (filtering as the user types).

export type FleetAsset = Pick<
  Asset,
  "id" | "name" | "make" | "model" | "category" | "site" | "status"
>;

export type FleetFilters = {
  /** Free text matched against ID, name, make, model and site. */
  q: string;
  /** Asset type (`category`); empty means any. */
  type: string;
  site: string;
  status: string;
};

export const emptyFilters: FleetFilters = {
  q: "",
  type: "",
  site: "",
  status: "",
};

const keys = Object.keys(emptyFilters) as (keyof FleetFilters)[];

/** Reads filters from URL search params, ignoring repeated or missing values. */
export function filtersFromParams(
  params: Record<string, string | string[] | undefined>,
): FleetFilters {
  const filters = { ...emptyFilters };
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string") filters[key] = value;
  }
  return filters;
}

/** Reads the page number from URL search params; anything invalid is page 1. */
export function pageFromParams(
  params: Record<string, string | string[] | undefined>,
): number {
  const page = Number(params.page);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** The query string for filters and a page, leaving out empty ones and page 1. */
export function filtersToQuery(filters: FleetFilters, page = 1): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasFilters(filters: FleetFilters): boolean {
  return keys.some((key) => filters[key].trim() !== "");
}

export function filterFleet<T extends FleetAsset>(
  fleet: T[],
  filters: FleetFilters,
): T[] {
  const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return fleet.filter((asset) => {
    if (filters.type && asset.category !== filters.type) return false;
    if (filters.site && asset.site !== filters.site) return false;
    if (filters.status && asset.status !== filters.status) return false;
    if (terms.length === 0) return true;
    const haystack = [asset.id, asset.name, asset.make, asset.model, asset.site]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Assets per page (R37). */
export const pageSize = 8;

/**
 * One page of a list. A page past the end shows the last page, so a filter
 * that shrinks the list never leaves the user on an empty page.
 */
export function paginate<T>(items: T[], page: number, size = pageSize) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: current,
    pageCount,
    /** 1-based position of the first and last item shown; 0 when empty. */
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + size, items.length),
  };
}

/** Sorted distinct values of one field, for a filter's options. */
export function optionsFor(
  fleet: FleetAsset[],
  field: "category" | "site",
): string[] {
  return [...new Set(fleet.map((asset) => asset[field]))].sort((a, b) =>
    a.localeCompare(b),
  );
}
