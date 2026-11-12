# Plant Defect Triage — Requirements

Status: Version 6 (12 Nov 2026). Previous version: [version 5](requirements-v5.md).

Version 6 adds measurement of the AI draft step: what each draft costs, how long it takes, and how much reviewers change it. This file lists only what changed. Everything in version 5 that is not mentioned here still applies, with the same requirement numbers.

## Changes from version 5

Made before building milestone 6, at the user's request.

| Area | Version 5 | Version 6 | Why |
|---|---|---|---|
| Discarding a draft (R21) | Discard creates nothing | Discard creates no issue, no work order and stores no draft content. The measurements of the AI call (R39) are kept | Without them, the cost and speed of discarded drafts are lost, and the share of drafts that get approved cannot be measured |
| New requirements | | R39 to R43 (section 5.9): record each AI draft request, and show cost, speed and edit measures on an insights page | Requested: cost in tokens and dollars, p95 latency, and how much reviewers edit a draft |
| Acceptance criteria | | Three new criteria (below) | Cover R39 to R43 |
| "Discarding leaves no trace" (acceptance criteria) | No rows at all | No issue, work order, history entry, photo or draft content. The AI run's measurements remain | Follows from the R21 change |

## Changed requirement

### 5.5 Review and approval

- R21. **Changed.** Approve creates the issue and work order. Discard creates no issue, work order or history entry, and stores none of the draft, the notes or the photos. The AI request's measurements (R39) are kept.

## New requirements

### 5.9 AI measurement

- R39. **New.** Every AI draft request is recorded, whether it succeeds or fails, with: the asset, the time, the model, input and output tokens, cost in US dollars, how long the request took, and whether it succeeded. The record holds no photos, notes or draft content.
- R40. **New.** When a reviewer approves an AI draft, the work order is linked to the AI request that produced it. A request that never leads to an approved work order counts as not approved. That covers both a discard and a reviewer who simply leaves.
- R41. **New.** An insights page shows, for the AI draft step:
  - the number of draft requests, and how many failed
  - cost per draft in tokens (input and output) and in dollars, as an average and a total
  - p50 and p95 request time, with the number of requests each figure is based on
  - the share of drafts that were approved
- R42. **New.** The insights page shows how much reviewers edited approved AI drafts:
  - the share approved with no changes
  - the average number of fields changed, out of the 12 fields on the review form
  - how often each field was changed, most often first
  - how often the severity was changed, and whether it was raised or lowered
- R43. **New.** The insights page can be narrowed to one model, so Sonnet and Haiku can be compared (section 8, model choice).

The insights page only reads data. It never changes a draft or a work order.

## Non-functional additions

- **Privacy.** Measurements stay in the app's own database and in Vercel AI Gateway's request logs. No draft content, notes or photos are sent to any other monitoring service.
- **Speed.** Recording a request must not slow the draft down. Anything that cannot be known by the time the draft returns, such as the final cost, is filled in afterwards.
- **Sample size.** Percentiles from a few requests are not reliable, so each figure shows how many requests it is based on.

## New acceptance criteria

- After a draft request, successful or failed, one AI run is recorded with its model, tokens, duration and outcome, and its cost appears within a few minutes.
- The insights page shows cost per draft, p50 and p95 request time, the approval share and the edit measures, and narrowing it to one model changes the figures to match.
- Approving a draft with one field edited counts as one changed field on the insights page. Approving an unedited draft counts as approved with no changes.

## Open questions

Still open from version 5: deployed URL protection.

New: none. Plan-dependent options (AI Gateway's AI Traces, Trace Drains and Custom Reporting need a Pro or Enterprise plan) are not required by these requirements.
