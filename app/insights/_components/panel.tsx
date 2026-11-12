import type { ReactNode } from "react";

// A titled card of figures on the Insights page.
export function Panel({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  /** Says what the figures are based on, such as the sample size. */
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-line bg-surface p-5 shadow-sm"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {note ? <p className="mt-1 text-sm text-text-muted">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Figures as a term and value list, each a large number with a label. */
export function Figures({
  items,
}: {
  items: { term: string; value: string; detail?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {items.map(({ term, value, detail }) => (
        <div key={term}>
          <dt className="text-sm text-text-muted">{term}</dt>
          <dd className="mt-1">
            <span className="text-2xl font-semibold tabular-nums">{value}</span>
            {detail ? (
              <span className="block text-sm text-text-muted">{detail}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
