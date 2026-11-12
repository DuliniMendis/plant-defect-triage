import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getInsightRuns } from "@/db/insights";
import { FieldChanges } from "./_components/field-changes";
import { ModelFilter } from "./_components/model-filter";
import { Figures, Panel } from "./_components/panel";
import {
  formatCount,
  formatPercent,
  formatSeconds,
  formatUsd,
  plural,
} from "./_lib/format";
import { INDICATIVE_BELOW, summarise, type Insights } from "./_lib/summarise";

export const metadata: Metadata = { title: "Insights · Plant Defect Triage" };

// Insights (R41 to R43, technical plan v3, section 4): what AI drafts cost,
// how long they take, how often they are approved and how much reviewers
// change them. Reads only.
export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <section aria-labelledby="insights-heading" className="space-y-6">
      <div className="space-y-1">
        <h1 id="insights-heading" className="text-2xl font-semibold">
          AI draft insights
        </h1>
        <p className="text-text-muted">
          Cost, speed and review measures for every AI draft request. Single
          requests can be checked in AI Gateway Logs under the tag{" "}
          <code className="font-mono">triage-draft</code>.
        </p>
      </div>
      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function InsightsContent({
  searchParams,
}: {
  searchParams: PageProps<"/insights">["searchParams"];
}) {
  // Read at request time, so the figures are always current.
  await connection();
  const [runs, params] = await Promise.all([getInsightRuns(), searchParams]);
  const model = typeof params.model === "string" && params.model ? params.model : undefined;
  const insights = summarise(runs, model);

  return (
    <div className="space-y-6">
      {insights.models.length > 0 ? (
        <ModelFilter models={insights.models} current={insights.model} />
      ) : null}
      {insights.requests.total === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-5 text-text-muted">
          {model
            ? `No AI draft requests for ${model} yet.`
            : "No AI draft requests yet. Draft a defect report with AI to see figures here."}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <RequestsPanel insights={insights} />
          <TimePanel insights={insights} />
          <CostPanel insights={insights} />
          <EditsPanel insights={insights} />
        </div>
      )}
    </div>
  );
}

function RequestsPanel({ insights }: { insights: Insights }) {
  const { requests, approval } = insights;
  return (
    <Panel
      id="requests-heading"
      title="Requests and approval"
      note="A draft counts as approved when a work order was saved from it. Discarded, abandoned and re-drafted ones are not approved."
    >
      <Figures
        items={[
          {
            term: "Draft requests",
            value: formatCount(requests.total),
            detail: `${formatCount(requests.failed)} failed`,
          },
          {
            term: "Approved",
            value: formatPercent(approval.share),
            detail: `${approval.approved} of ${plural(approval.drafts, "draft")}`,
          },
        ]}
      />
    </Panel>
  );
}

function TimePanel({ insights }: { insights: Insights }) {
  const { time } = insights;
  return (
    <Panel
      id="time-heading"
      title="Request time"
      note={
        <>
          Over {plural(time.count, "succeeded draft")}.
          {time.indicative && time.count > 0
            ? ` Indicative only: fewer than ${INDICATIVE_BELOW} drafts.`
            : null}
        </>
      }
    >
      <Figures
        items={[
          { term: "p50 (median)", value: formatSeconds(time.p50Ms) },
          { term: "p95", value: formatSeconds(time.p95Ms) },
        ]}
      />
    </Panel>
  );
}

function CostPanel({ insights }: { insights: Insights }) {
  const { cost } = insights;
  return (
    <Panel
      id="cost-heading"
      title="Cost"
      note={
        <>
          Per draft over {plural(cost.draftsCosted, "draft")} with a known cost. The total
          includes failed requests.
          {cost.missing > 0
            ? ` Cost not known yet for ${plural(cost.missing, "request")}; AI Gateway can take a few minutes to report it.`
            : null}
        </>
      }
    >
      <Figures
        items={[
          { term: "Per draft", value: formatUsd(cost.averageUsd) },
          { term: "Total spent", value: formatUsd(cost.totalUsd) },
          {
            term: "Tokens per draft",
            value: formatCount(
              cost.averageInputTokens === null || cost.averageOutputTokens === null
                ? null
                : cost.averageInputTokens + cost.averageOutputTokens,
            ),
            detail: `${formatCount(cost.averageInputTokens)} in, ${formatCount(cost.averageOutputTokens)} out`,
          },
          {
            term: "Tokens in total",
            value: formatCount(cost.totalInputTokens + cost.totalOutputTokens),
            detail: `${formatCount(cost.totalInputTokens)} in, ${formatCount(cost.totalOutputTokens)} out`,
          },
        ]}
      />
    </Panel>
  );
}

function EditsPanel({ insights }: { insights: Insights }) {
  const { edits } = insights;
  return (
    <Panel
      id="edits-heading"
      title="Reviewer edits"
      note={`Over ${plural(edits.approved, "approved AI draft")}. A field counts once however much it was changed.`}
    >
      {edits.approved === 0 ? (
        <p className="text-text-muted">No AI drafts have been approved yet.</p>
      ) : (
        <div className="space-y-6">
          <Figures
            items={[
              {
                term: "Approved with no changes",
                value: formatPercent(edits.unchangedShare),
                detail: `${edits.unchanged} of ${edits.approved}`,
              },
              {
                term: "Fields changed per draft",
                value: formatCount(edits.averageChanged, 1),
                detail: `out of ${edits.fieldCount}`,
              },
              {
                term: "Severity changed",
                value: formatCount(edits.severity.changed),
                detail: `${edits.severity.raised} raised, ${edits.severity.lowered} lowered`,
              },
            ]}
          />
          <FieldChanges fields={edits.byField} approved={edits.approved} />
        </div>
      )}
    </Panel>
  );
}

function InsightsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading insights" className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-surface-raised" />
      ))}
    </div>
  );
}
