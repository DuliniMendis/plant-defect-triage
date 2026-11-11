"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when the asset profile fails to load, for example when the database is
// unreachable. The header and disclaimer footer from the root layout stay.
export default function AssetError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Could not load this asset</h1>
      <p className="text-text-muted">
        Something went wrong while reading the asset. Try again, or go back to
        the fleet.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-ink px-4 py-2 font-semibold text-surface hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to the fleet
        </Link>
      </div>
    </section>
  );
}
