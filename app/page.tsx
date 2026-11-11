import { connection } from "next/server";
import { Suspense } from "react";
import { FleetBrowser } from "./_components/fleet-browser";
import { filtersFromParams, pageFromParams } from "./_lib/filter-fleet";
import { listFleet } from "./_lib/fleet";

// Fleet screen (R1, R4): every asset, with a search box, filters by type,
// site and status, and pages of eight. The QR code upload (R2) arrives in
// milestone 8.
export default function FleetPage({ searchParams }: PageProps<"/">) {
  return (
    <section aria-labelledby="fleet-heading" className="space-y-6">
      <div className="space-y-1">
        <h1 id="fleet-heading" className="text-2xl font-semibold">
          Fleet
        </h1>
        <p className="text-text-muted">
          Pick an asset to see its history or report a defect.
        </p>
      </div>
      <Suspense fallback={<FleetSkeleton />}>
        <FleetList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function FleetList({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  // Read at request time, never at build time, so the list is always current.
  await connection();
  const [fleet, params] = await Promise.all([listFleet(), searchParams]);

  if (fleet.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface p-5 text-text-muted">
        No assets found. Run <code className="font-mono">pnpm db:seed</code> to
        load the demo fleet.
      </p>
    );
  }

  return (
    <FleetBrowser
      fleet={fleet}
      initialFilters={filtersFromParams(params)}
      initialPage={pageFromParams(params)}
    />
  );
}

function FleetSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading assets" className="space-y-4">
      <div className="h-16 animate-pulse rounded-md bg-surface-raised" />
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <div className="h-10 bg-surface-raised" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
