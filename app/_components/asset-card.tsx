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
      className="group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-sm font-semibold text-accent">
          {asset.id}
        </span>
        <StatusBadge status={asset.status} />
      </div>
      <div>
        <h2 className="text-lg font-semibold group-hover:text-accent-strong">
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
