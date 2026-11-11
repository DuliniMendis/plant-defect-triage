"use client";

import { useId, useRef, useState } from "react";
import {
  emptyFilters,
  filterFleet,
  filtersToQuery,
  hasFilters,
  optionsFor,
  paginate,
  type FleetAsset,
  type FleetFilters,
} from "../_lib/filter-fleet";
import { AssetTable } from "./asset-table";
import { statusLabels, type Status } from "./status-badge";

const statuses = Object.keys(statusLabels) as Status[];

const fieldClass =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-text shadow-sm focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink";

// Search box, filters and pages over the fleet (R1, R4). Filtering and paging
// happen in the browser so results update as the user types; both are mirrored
// into the URL so going back from an asset profile restores them.
export function FleetBrowser({
  fleet,
  initialFilters,
  initialPage = 1,
}: {
  fleet: FleetAsset[];
  initialFilters: FleetFilters;
  initialPage?: number;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [requestedPage, setRequestedPage] = useState(initialPage);
  const resultsRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const types = optionsFor(fleet, "category");
  const sites = optionsFor(fleet, "site");
  const matches = filterFleet(fleet, filters);
  const { items: shown, page, pageCount, from, to } = paginate(
    matches,
    requestedPage,
  );
  const filtered = hasFilters(filters);

  // Changing a filter goes back to page 1.
  function update(next: FleetFilters, nextPage = 1) {
    setFilters(next);
    setRequestedPage(nextPage);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${filtersToQuery(next, nextPage)}`,
    );
  }

  function goToPage(nextPage: number) {
    update(filters, nextPage);
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) resultsRef.current?.scrollIntoView({ block: "start" });
  }

  function set(key: keyof FleetFilters) {
    return (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => update({ ...filters, [key]: event.target.value });
  }

  return (
    <div ref={resultsRef} className="scroll-mt-4 space-y-4">
      <div role="search" aria-label="Filter assets" className="grid gap-3 md:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-1 md:col-span-3 lg:col-span-1">
          <label htmlFor={`${id}-q`} className="text-sm font-medium">
            Search
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={filters.q}
            onChange={set("q")}
            placeholder="ID, name, make, model or site"
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <FilterSelect id={`${id}-type`} label="Type" value={filters.type} onChange={set("type")}>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id={`${id}-site`} label="Site" value={filters.site} onChange={set("site")}>
          {sites.map((site) => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect id={`${id}-status`} label="Status" value={filters.status} onChange={set("status")}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="flex min-h-8 items-center justify-between gap-3 text-sm">
        <p role="status" className="text-text-muted">
          {matches.length === 0
            ? `No matches among ${fleet.length} assets`
            : `Showing ${from}–${to} of ${matches.length}${filtered ? ` matching (${fleet.length} total)` : " assets"}`}
        </p>
        {filtered ? (
          <button
            type="button"
            onClick={() => update(emptyFilters)}
            className="rounded-md px-2 py-1 font-medium underline decoration-accent decoration-2 underline-offset-4 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ink"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {shown.length > 0 ? (
        <AssetTable assets={shown} />
      ) : (
        <p className="rounded-lg border border-line bg-surface p-5 text-text-muted">
          No assets match these filters.
        </p>
      )}

      {pageCount > 1 ? (
        <Pagination page={page} pageCount={pageCount} onChange={goToPage} />
      ) : null}
    </div>
  );
}

const pageButtonClass =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-40";

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={`${pageButtonClass} border-line bg-surface hover:border-ink`}
      >
        Previous
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          aria-label={`Page ${n}`}
          className={
            n === page
              ? `${pageButtonClass} border-ink bg-ink text-accent`
              : `${pageButtonClass} border-line bg-surface hover:border-ink`
          }
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className={`${pageButtonClass} border-line bg-surface hover:border-ink`}
      >
        Next
      </button>
    </nav>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={onChange} className={fieldClass}>
        <option value="">All</option>
        {children}
      </select>
    </div>
  );
}
