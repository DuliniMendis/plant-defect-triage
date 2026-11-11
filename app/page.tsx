import { connection } from "next/server";
import { Suspense } from "react";
import { AssetCard } from "./_components/asset-card";
import { listFleet } from "./_lib/fleet";

// Fleet screen (R1, R4). The QR code upload (R2) arrives in milestone 8.
export default function FleetPage() {
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
        <FleetList />
      </Suspense>
    </section>
  );
}

const gridClass = "grid gap-4 md:grid-cols-2 lg:grid-cols-4";

async function FleetList() {
  // Read at request time, never at build time, so the list is always current.
  await connection();
  const fleet = await listFleet();

  if (fleet.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface p-5 text-text-muted">
        No assets found. Run <code className="font-mono">pnpm db:seed</code> to
        load the demo fleet.
      </p>
    );
  }

  return (
    <ul aria-label="Assets" className={gridClass}>
      {fleet.map((asset) => (
        <li key={asset.id}>
          <AssetCard asset={asset} />
        </li>
      ))}
    </ul>
  );
}

function FleetSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading assets" className={gridClass}>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-lg border border-line bg-surface"
        />
      ))}
    </div>
  );
}
