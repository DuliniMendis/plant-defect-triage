import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_MODEL, draftTriage } from "@/app/api/triage/_lib/draft-triage";
import type { PromptPhoto } from "@/app/api/triage/_lib/prompt";
import { caseKinds, triageCases, type TriageCase } from "./cases";
import { loadPhoto, seededAsset, seededHistory } from "./fixtures";
import { scoreDraft } from "./score";
import { summarise, type RunResult } from "./summary";

// `pnpm eval`: runs the fixed triage cases through the real draft call on one
// or more AI Gateway models and scores each draft (DUL-56, DUL-57, DUL-64).
//
//   pnpm eval                                   Sonnet 5.5 and Haiku 5.5, every case once
//   pnpm eval --models anthropic/claude-haiku-5.5
//   pnpm eval --cases repeat,gn-003-safety-fuel  Case IDs or kinds
//   pnpm eval --runs 3                          Repeat each case to see variance
//
// Calls AI Gateway, so it needs VERCEL_OIDC_TOKEN (from `vercel env pull`) or
// AI_GATEWAY_API_KEY, and costs a few cents a run. Not part of `pnpm test`.
// Writes a JSON report to evals/results/.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const DEFAULT_MODELS = [DEFAULT_MODEL, "anthropic/claude-haiku-5.5"];

// Gateway list prices per million tokens, 11 Nov 2026 (technical plan v2,
// section 3). Used only for a rough cost line; cache reads cost less.
const PRICES: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-5.5": { input: 2, output: 10 },
  "anthropic/claude-haiku-5.5": { input: 0.1, output: 0.5 },
};

const { values: args } = parseArgs({
  options: {
    models: { type: "string" },
    cases: { type: "string" },
    runs: { type: "string", default: "1" },
    concurrency: { type: "string", default: "4" },
  },
});

const models = args.models ? split(args.models) : DEFAULT_MODELS;
const runs = Math.max(1, Number(args.runs) || 1);
const concurrency = Math.max(1, Number(args.concurrency) || 4);
const cases = pickCases(args.cases);

if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
  console.error(
    "No AI Gateway credentials. Run `vercel env pull .env.local` (or set AI_GATEWAY_API_KEY) first.",
  );
  process.exit(1);
}

// draftTriage logs token usage with console.info; collect it per model for
// the cost line instead of printing it.
const tokens = new Map<string, { input: number; output: number; cacheRead: number }>();
const info = console.info;
console.info = (label: unknown, data?: Record<string, unknown>) => {
  if (label !== "triage" || !data) return info(label, data);
  const model = String(data.model);
  const t = tokens.get(model) ?? { input: 0, output: 0, cacheRead: 0 };
  t.input += Number(data.inputTokens ?? 0);
  t.output += Number(data.outputTokens ?? 0);
  t.cacheRead += Number(data.cacheReadTokens ?? 0);
  tokens.set(model, t);
};

const photos = new Map<TriageCase, PromptPhoto[]>(
  await Promise.all(
    cases.map(async (c) => [c, await Promise.all(c.photos.map(loadPhoto))] as const),
  ),
);

const jobs = models.flatMap((model) =>
  cases.flatMap((c) => Array.from({ length: runs }, (_, run) => ({ model, c, run: run + 1 }))),
);
console.log(
  `Running ${cases.length} case(s) × ${models.length} model(s) × ${runs} run(s) = ${jobs.length} call(s)…\n`,
);

const results: RunResult[] = await pool(jobs, concurrency, async ({ model, c, run }) => {
  const started = performance.now();
  const casePhotos = photos.get(c) ?? [];
  try {
    const response = await draftTriage({
      model,
      asset: seededAsset(c.assetId),
      history: seededHistory(c.assetId),
      pastWorkOrders: [],
      notes: c.notes,
      photos: casePhotos,
    });
    const score = scoreDraft(response.draft, c.expect, { photoCount: casePhotos.length });
    const result: RunResult = {
      model,
      caseId: c.id,
      run,
      durationMs: response.durationMs,
      score,
      draft: response.draft,
    };
    console.log(line(result));
    return result;
  } catch (cause) {
    const result: RunResult = {
      model,
      caseId: c.id,
      run,
      durationMs: Math.round(performance.now() - started),
      error: describe(cause),
    };
    console.log(line(result));
    return result;
  }
});

console.info = info;

const summaries = summarise(results);
console.log("\nSummary");
for (const s of summaries) {
  const t = tokens.get(s.model);
  const price = PRICES[s.model];
  const cost = t && price ? (t.input * price.input + t.output * price.output) / 1e6 : null;
  console.log(`\n${s.model}`);
  console.log(`  Cases passed       ${s.passed}/${s.runs}${s.errors ? ` (${s.errors} failed calls)` : ""}`);
  console.log(`  Under-rated        ${s.underRated} (severity below the allowed range)`);
  for (const [name, c] of Object.entries(s.checks)) {
    console.log(`  ${name.padEnd(19)}${c.passed}/${c.total}`);
  }
  console.log(`  Response time      median ${seconds(s.medianMs)}, max ${seconds(s.maxMs)}`);
  if (t) {
    console.log(
      `  Tokens             ${t.input} in (${t.cacheRead} from cache), ${t.output} out` +
        (cost !== null ? `, about $${cost.toFixed(3)} at list price` : ""),
    );
  }
}

const dir = path.join(process.cwd(), "evals", "results");
await mkdir(dir, { recursive: true });
const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await writeFile(
  file,
  JSON.stringify(
    { ranAt: new Date().toISOString(), models, runs, summaries, tokens: Object.fromEntries(tokens), results },
    null,
    2,
  ),
);
console.log(`\nReport: ${path.relative(process.cwd(), file)}`);

// ---

function split(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickCases(filter: string | undefined): TriageCase[] {
  if (!filter) return [...triageCases];
  const wanted = split(filter);
  const picked = triageCases.filter(
    (c) => wanted.includes(c.id) || wanted.includes(c.kind) || wanted.includes(c.assetId),
  );
  if (picked.length === 0) {
    console.error(
      `No cases match "${filter}". Use case IDs, asset IDs or kinds (${caseKinds.join(", ")}).`,
    );
    process.exit(1);
  }
  return picked;
}

function line(r: RunResult): string {
  const head = `${r.score?.pass ? "PASS" : "FAIL"}  ${shortModel(r.model).padEnd(10)} ${r.caseId.padEnd(26)} ${seconds(r.durationMs).padStart(6)}`;
  if (r.error) return `${head}  error: ${r.error}`;
  const failed = r.score!.checks.filter((c) => !c.pass);
  return failed.length === 0
    ? head
    : `${head}  ${failed.map((c) => `${c.name}: wanted ${c.expected}, got ${c.actual}`).join("; ")}`;
}

function shortModel(model: string): string {
  return model.replace(/^anthropic\/claude-/, "");
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function describe(cause: unknown): string {
  if (!(cause instanceof Error)) return String(cause);
  const inner = cause.cause instanceof Error ? `: ${cause.cause.message}` : "";
  return `${cause.message}${inner}`.slice(0, 200);
}

async function pool<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await work(items[i]);
      }
    }),
  );
  return out;
}
