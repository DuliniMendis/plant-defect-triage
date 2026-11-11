# AI triage evals

How the AI draft is tested, and what each run found. The cases, scoring and runner are in [`evals/`](../evals); how to run them is in the [README](../README.md#ai-triage-evals).

## Runs

### Run 1: 11 Nov 2026, before M7

Main at M6 (`ea0ca8f`). The prompt and draft call as merged in M6; the M7 repeat-check and clarification changes were not in yet. 12 cases, one run each, reasoning effort low.

| | Claude Sonnet 5.5 | Claude Haiku 5.5 |
|---|---|---|
| Cases passed | 12 / 12 | 12 / 12 |
| Severity under-rated | 0 | 0 |
| Severity in range | 9 / 9 | 9 / 9 |
| Safe to operate | 4 / 4 | 4 / 4 |
| Repeat check | 8 / 8 | 8 / 8 |
| Clarifying question when needed, none when not | 5 / 5 | 5 / 5 |
| Confidence | 3 / 3 | 3 / 3 |
| Component reused from history | 4 / 4 | 4 / 4 |
| No photo observations without photos | 5 / 5 | 5 / 5 |
| Median response time | 6.9 s | 5.2 s |
| Slowest response | 9.0 s | 10.0 s |
| Tokens in (from cache) / out | 46,407 (33,087) / 8,806 | 46,407 (32,771) / 10,476 |
| Cost at list price, before cache discount | about $0.18 | about $0.01 |

Both models passed every case. Haiku was faster at the median and about one eighteenth of the cost. One run per case says little about variance, so before switching the default (DUL-57) run the set again with `--runs 3`, and again after M7 lands, since M7 changes the prompt.
