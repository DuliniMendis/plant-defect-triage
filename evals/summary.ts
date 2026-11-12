import type { TriageDraft } from "@/lib/schema";
import { checkNames, type CheckName, type Score } from "./score";

// Per-model totals across every case and run.

export type RunResult = {
  model: string;
  caseId: string;
  run: number;
  durationMs: number;
  /** Set when the call failed; `score` is then empty. */
  error?: string;
  score?: Score;
  /** The draft as returned, kept in the JSON report for reading failures. */
  draft?: TriageDraft;
};

export type ModelSummary = {
  model: string;
  runs: number;
  passed: number;
  errors: number;
  underRated: number;
  /** Passed / scored, per check, over the runs that had that check. */
  checks: Partial<Record<CheckName, { passed: number; total: number }>>;
  medianMs: number;
  maxMs: number;
};

export function summarise(results: readonly RunResult[]): ModelSummary[] {
  const models = [...new Set(results.map((r) => r.model))];
  return models.map((model) => {
    const mine = results.filter((r) => r.model === model);
    const checks: ModelSummary["checks"] = {};
    for (const name of checkNames) {
      const all = mine.flatMap((r) => r.score?.checks.filter((c) => c.name === name) ?? []);
      if (all.length > 0) {
        checks[name] = { passed: all.filter((c) => c.pass).length, total: all.length };
      }
    }
    const times = mine.filter((r) => !r.error).map((r) => r.durationMs);
    return {
      model,
      runs: mine.length,
      passed: mine.filter((r) => r.score?.pass).length,
      errors: mine.filter((r) => r.error).length,
      underRated: mine.filter((r) => r.score?.underRated).length,
      checks,
      medianMs: median(times),
      maxMs: times.length ? Math.max(...times) : 0,
    };
  });
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
