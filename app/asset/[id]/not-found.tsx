import Link from "next/link";

// Shown when `/asset/[id]` names an asset that does not exist.
export default function AssetNotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Asset not found</h1>
      <p className="text-text-muted">
        There is no asset with that ID. Check the ID on the asset&apos;s QR
        code, or pick it from the fleet.
      </p>
      <Link
        href="/"
        className="inline-block rounded-md bg-ink px-4 py-2 font-semibold text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Back to the fleet
      </Link>
    </section>
  );
}
