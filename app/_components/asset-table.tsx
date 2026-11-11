import Link from "next/link";
import type { FleetAsset } from "../_lib/filter-fleet";
import { StatusBadge } from "./status-badge";

const th =
  "px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-text-muted uppercase";
const td = "px-4 py-3 align-middle";

// The fleet as a vertical list, one asset per row, so a sorted list scans in
// one direction (R1). The asset name is the row's link, and it is stretched
// over the whole row so any part of the row opens the profile (R4).
//
// Type is hidden below desktop width to keep the table inside 768px; the
// asset's name and model already say what it is.
export function AssetTable({ assets }: { assets: FleetAsset[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <table aria-label="Assets" className="w-full border-collapse text-sm">
        <thead className="border-b border-line bg-surface-raised">
          <tr>
            <th scope="col" className={`${th} w-28`}>
              ID
            </th>
            <th scope="col" className={th}>
              Asset
            </th>
            <th scope="col" className={`${th} hidden lg:table-cell`}>
              Type
            </th>
            <th scope="col" className={th}>
              Site
            </th>
            <th scope="col" className={`${th} w-40`}>
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {assets.map((asset) => (
            <tr
              key={asset.id}
              className="relative transition-colors hover:bg-surface-raised has-focus-visible:bg-surface-raised"
            >
              <td className={td}>
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs font-semibold text-accent-ink">
                  {asset.id}
                </span>
              </td>
              <td className={td}>
                <Link
                  href={`/asset/${asset.id}`}
                  className="font-semibold decoration-accent decoration-4 underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ink"
                >
                  {asset.name}
                </Link>
                <div className="text-text-muted">
                  {asset.make} {asset.model}
                </div>
              </td>
              <td className={`${td} hidden lg:table-cell`}>{asset.category}</td>
              <td className={td}>{asset.site}</td>
              <td className={td}>
                <StatusBadge status={asset.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
