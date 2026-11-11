import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAsset, getAssetHistory } from "@/db/queries";
import { getWorkOrderPhotos } from "@/db/work-orders";
import { DefectCapture } from "./_components/defect-capture";
import { HistoryTimeline } from "./_components/history-timeline";
import { KeyFacts } from "./_components/key-facts";
import { LinkedHistoryProvider } from "./_components/linked-history";

// Asset profile (R5, R6) with defect capture (R7 to R10) and the issue and
// work order form (R20 to R28) in the right-hand column, which an AI draft
// fills (milestones 6 and 7). A repeat finding in the draft highlights the
// history entries it links to, beside the claim. `params` and the
// database reads are request-time data under Cache Components, so they sit
// inside a Suspense boundary.
export default function AssetPage({ params }: PageProps<"/asset/[id]">) {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="text-sm text-text-muted decoration-accent decoration-2 underline-offset-4 hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-ink"
      >
        ← Fleet
      </Link>
      <Suspense fallback={<p className="text-text-muted">Loading asset…</p>}>
        <AssetProfile params={params} />
      </Suspense>
    </div>
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

  if (!asset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-2xl font-semibold">
          {asset.name}
          <span className="rounded bg-accent px-1.5 font-mono text-lg text-accent-ink">
            {asset.id}
          </span>
        </h1>
        <p className="mt-1 text-text-muted">{asset.category}</p>
      </header>

      {/* One column at tablet portrait; two on desktop, with facts and
          history on the left and defect capture on the right (plan section 7). */}
      <LinkedHistoryProvider
        entries={history.map(({ id, title, date }) => ({ id, title, date }))}
      >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <KeyFacts asset={asset} />
          <HistoryTimeline entries={history} photos={photos} />
        </div>
        <div className="max-lg:order-first lg:sticky lg:top-8">
          <DefectCapture assetId={asset.id} />
        </div>
      </div>
      </LinkedHistoryProvider>
    </div>
  );
}
