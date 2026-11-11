import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/status-badge";
import { getAsset, getAssetHistory } from "@/db/queries";
import { getWorkOrderPhotos } from "@/db/work-orders";
import { DefectCapture } from "./_components/defect-capture";
import { WorkOrderPhotos } from "./_components/work-order-photos";

// Asset profile with defect capture and review (R5 to R25). Built out in
// milestones 2 to 7. `params` and the database reads are request-time data
// under Cache Components, so they sit inside a Suspense boundary.
//
// Stand-in until milestone 2 merges: M2's page has the key facts and the full
// history timeline. When merging, keep M2's page, swap its <ReportDefect />
// for <DefectCapture assetId={asset.id} />, and render <WorkOrderPhotos /> on
// work order entries in M2's HistoryTimeline, using getWorkOrderPhotos().
export default function AssetPage({ params }: PageProps<"/asset/[id]">) {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading asset…</p>}>
      <AssetProfile params={params} />
    </Suspense>
  );
}

async function AssetProfile({
  params,
}: {
  params: PageProps<"/asset/[id]">["params"];
}) {
  const { id } = await params;
  const [asset, history, photos] = await Promise.all([
    getAsset(id),
    getAssetHistory(id),
    getWorkOrderPhotos(id),
  ]);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-2xl font-semibold">
          {asset.name}
          <span className="rounded bg-accent px-1.5 font-mono text-lg text-accent-ink">
            {asset.id}
          </span>
        </h1>
        <p aria-label="Status">
          <StatusBadge status={asset.status} />
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <section
          aria-labelledby="history-heading"
          className="rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="history-heading" className="text-lg font-semibold">
            History
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Simple list until the asset profile (milestone 2) merges.
          </p>
          <ol aria-labelledby="history-heading" className="mt-4 space-y-3">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-md border border-line bg-page p-4">
                <p className="text-sm text-text-muted">
                  {entry.kind === "work-order" ? "Work order" : entry.kind} ·{" "}
                  <time dateTime={entry.date}>{entry.date}</time> ·{" "}
                  {entry.status === "open" ? "Open" : "Closed"}
                </p>
                <h3 className="mt-1 font-medium">{entry.title}</h3>
                {entry.detail && (
                  <p className="mt-1 text-sm text-text-muted">{entry.detail}</p>
                )}
                {entry.workOrderId && (
                  <WorkOrderPhotos
                    photos={photos[entry.workOrderId] ?? []}
                    title={entry.title}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
        <div className="max-lg:order-first lg:sticky lg:top-8">
          <DefectCapture assetId={asset.id} />
        </div>
      </div>
    </div>
  );
}
