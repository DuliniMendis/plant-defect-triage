import { Suspense } from "react";
import { DefectCapture } from "./_components/defect-capture";

// Asset profile with defect capture and review (R5 to R25). Built out in
// milestones 2 to 7. `params` is request-time data under Cache Components, so
// the part that reads it sits inside a Suspense boundary.
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
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Asset <span className="rounded bg-accent px-1.5 font-mono text-accent-ink">{id}</span>
      </h1>
      <p className="text-text-muted">Asset profile coming in milestone 2.</p>
      {/* Stand-in until milestone 2 merges: M2's profile page renders
          <ReportDefect /> in its right-hand column; swap that for
          <DefectCapture /> when merging. */}
      <div className="max-w-xl">
        <DefectCapture />
      </div>
    </section>
  );
}
