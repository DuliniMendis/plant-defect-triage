import Link from "next/link";

// Narrows every figure to one model (R43), through the `model` search
// parameter, so a filtered view can be shared as a link.
export function ModelFilter({
  models,
  current,
}: {
  models: readonly string[];
  current: string | null;
}) {
  const options = [
    { label: "All models", href: "/insights", active: current === null },
    ...models.map((model) => ({
      label: model,
      href: `/insights?${new URLSearchParams({ model })}`,
      active: current === model,
    })),
  ];

  return (
    <nav aria-label="Model">
      <ul className="flex flex-wrap gap-2">
        {options.map(({ label, href, active }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "inline-block rounded-md border border-ink bg-ink px-3 py-2 text-sm font-medium text-accent"
                  : "inline-block rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-text hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
              }
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
