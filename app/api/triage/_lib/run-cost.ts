// Looks up what an AI Gateway request cost, after the draft has been returned
// (R39, technical plan v3, section 2). The gateway can take about 90 seconds
// to ingest a request, so the lookup is retried with a growing delay. If the
// cost never arrives, null is returned and the run's cost stays empty, which
// the Insights page shows as "not known yet", never as zero.

/** Seconds to wait before each attempt: about three minutes in all. */
export const COST_RETRY_DELAYS_S = [10, 20, 30, 45, 60] as const;

export async function lookUpCost(
  generationId: string,
  {
    lookup,
    delaysS = COST_RETRY_DELAYS_S,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: {
    lookup: (id: string) => Promise<{ totalCost: number }>;
    delaysS?: readonly number[];
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<number | null> {
  for (const delay of delaysS) {
    await sleep(delay * 1000);
    try {
      const { totalCost } = await lookup(generationId);
      if (Number.isFinite(totalCost)) return totalCost;
    } catch {
      // Not ingested yet, or a passing gateway error: try again.
    }
  }
  return null;
}
