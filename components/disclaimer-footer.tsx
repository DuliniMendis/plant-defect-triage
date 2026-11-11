// Short form of the disclaimer, shown on every screen (R32). The full wording
// is in README.md.
export function DisclaimerFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <p className="mx-auto max-w-6xl px-6 py-4 text-xs leading-5 text-text-muted">
        Independent concept demo with fictional asset data. Not a commercial
        product, and not affiliated with any equipment maker or software
        vendor. Equipment makes and models are named only for realism. Not for
        commercial use.
      </p>
    </footer>
  );
}
