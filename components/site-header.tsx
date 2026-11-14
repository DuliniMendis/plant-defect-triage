import Link from "next/link";

const navLink =
  "text-sm font-medium text-ink-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent";

export function SiteHeader() {
  return (
    <header className="border-b-4 border-accent bg-ink">
      <div className="mx-auto flex max-w-6xl items-baseline gap-3 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-accent">
          Plant Defect Triage
        </Link>
        <span className="text-sm text-ink-muted">Concept demo</span>
        <nav aria-label="Main" className="ml-auto flex gap-5">
          <Link href="/test-files" className={navLink}>
            Test files
          </Link>
          <Link href="/insights" className={navLink}>
            Insights
          </Link>
        </nav>
      </div>
    </header>
  );
}
