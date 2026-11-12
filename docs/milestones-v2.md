# Plant Defect Triage — Milestones

Status: Draft 2 (12 Nov 2026). Based on [requirements version 6](requirements-v6.md) and [technical plan version 3](technical-plan-v3.md). Revised from [draft 1](milestones.md).

Draft 2 adds measurement of the AI draft step as a new milestone. This file lists only what changed. Every milestone in draft 1 that is not mentioned here is unchanged. Milestones 1 to 8 were built when this draft was written, so all the measurement work goes into the new milestone rather than into milestone 6.

## Changes from draft 1

| Area | Draft 1 | Draft 2 | Why |
|---|---|---|---|
| Milestone 10 | | New: AI insights. Records every AI draft request and shows cost, time, approval and edit measures on an Insights page | R39 to R43. Milestones 6 and 7, where recording would otherwise go, were already built |
| Milestone 9 | Compare Sonnet and Haiku on the test cases | Also uses the Insights page, narrowed by model, for the cost and time comparison | R43 |
| Dependencies | M7 → M9 | Adds M7 → M10 → M9 | M10 changes the triage and work order routes that M6 and M7 built, and its page is used in the release checks |

## Summary addition

| # | Linear | Milestone | What a user can do at the end | Requirements |
|---|---|---|---|---|
| 10 | Not created yet | AI insights | See what AI drafts cost in tokens and dollars, their p50 and p95 time, how often they are approved and how much reviewers change them, for all models or one | R21 (changed), R39 to R43 |

### Dependencies

```mermaid
flowchart LR
  M6[M6 AI fills form] --> M7[M7 Repeat check and question]
  M7 --> M10[M10 AI insights]
  M10 --> M9[M9 Demo-ready release]
```

## 10. AI insights

Deliverable: every AI draft request is measured, and an Insights page shows the results.

| Task | Notes |
|---|---|
| `ai_runs` table, `work_orders.ai_run_id`, and a migration | Data model draft 3 |
| Record a run for every triage request, succeeded or failed; return `runId` | R39. Plan v3, section 2. A failed insert must not fail the draft |
| Fetch the cost with `gateway.getGenerationInfo()` after the response, using `after()`; retry while the gateway ingests the request | R39. Plan v3, section 2 |
| Tag the Gateway requests `triage-draft` and set the telemetry `functionId` | Plan v3, changes table. Lets the requests be filtered in AI Gateway Logs |
| Send `aiRunId` with an approved AI draft; the server checks it and links it in the same transaction | R40. Plan v3, section 3 |
| Insights figures: counts, cost and token averages and totals, p50 and p95 time, approval share, edit measures | R41, R42. Plan v3, section 4 |
| Unit tests for the run link rules, edit measures and percentiles | Plan v3, section 7 |
| `app/insights/page.tsx` with its panels in `_components/`; reads inside `<Suspense>` | R41, R42 |
| Model picker using `?model=` | R43 |
| Sample size on every figure; indicative label below 20 runs | Requirements v6, non-functional additions |
| Insights link in the header | |
| Playwright test with seeded runs and work orders | Plan v3, section 7 |

Done when: each draft request, including a failed one, leaves one run with its tokens and time, and its cost appears within a few minutes; approving the draft links the work order to that run; after a few drafts, some approved with edits and some discarded, the Insights page shows the right cost, p95 time, approval share and changed-field counts, and narrowing it to one model changes the figures to match.

## 9. Demo-ready release: changed task

| Task | Notes |
|---|---|
| Compare Sonnet 5.5 and Haiku 5.5 on the test cases; pick the default. Use the Insights page, narrowed by model, for cost and time | Plan v2, section 3; R43 |
