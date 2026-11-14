// A link that saves a file from public/demo-files/ rather than opening it.
// `what` completes the link's name for screen readers and tests, so each of
// the many "Download" links on the page says what it downloads.
export function DownloadLink({ href, what }: { href: string; what: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex h-9 items-center rounded-md border border-line bg-surface px-3 text-sm font-semibold hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      Download <span className="sr-only">{what}</span>
    </a>
  );
}
