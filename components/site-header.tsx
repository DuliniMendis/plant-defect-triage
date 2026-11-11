import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b-4 border-accent bg-ink">
      <div className="mx-auto flex max-w-6xl items-baseline gap-3 px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-accent">
          Plant Defect Triage
        </Link>
        <span className="text-sm text-ink-muted">Concept demo</span>
      </div>
    </header>
  );
}
