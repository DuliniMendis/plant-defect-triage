// Short form of the disclaimer, shown on every screen (R32). The full wording
// is in README.md.
export function DisclaimerFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <p className="mx-auto max-w-6xl px-6 py-4 text-xs leading-5 text-text-muted">
        Independent concept demo built for a job interview. Not a Sitemate
        product, and not affiliated with, endorsed by or sponsored by Sitemate.
        Sitemate product names are used only to describe the idea. Built from
        public information, with fictional asset data. Not for commercial use.
      </p>
    </footer>
  );
}
