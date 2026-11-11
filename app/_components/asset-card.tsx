import Link from "next/link";
import type { Asset } from "@/db/schema";
import { StatusBadge } from "./status-badge";

type AssetSummary = Pick<
  Asset,
  "id" | "name" | "make" | "model" | "site" | "status"
>;

// One asset on the fleet screen (R1). The whole card links to the asset
// profile, so every asset can be opened without a QR code (R4).
export function AssetCard({ asset }: { asset: AssetSummary }) {
  return (
    <Link
      href={`/asset/${asset.id}`}
      className="group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-colors shadow-sm hover:border-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-sm font-semibold text-accent-ink">
          {asset.id}
        </span>
        <StatusBadge status={asset.status} />
      </div>
      <div>
        <h2 className="text-lg font-semibold decoration-accent decoration-4 underline-offset-4 group-hover:underline">
          {asset.name}
        </h2>
        <p className="text-sm text-text-muted">
          {asset.make} {asset.model}
        </p>
      </div>
      <p className="mt-auto text-sm">
        <span className="text-text-muted">Site: </span>
        {asset.site}
      </p>
    </Link>
  );
}
