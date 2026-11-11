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

### Run 2: 11 Nov 2026, after M7

Main at M7 (`534ea7c`), with the repeat-check and clarification prompt rules. 12 cases, three runs each (36 drafts per model), reasoning effort low.

| | Claude Sonnet 5.5 | Claude Haiku 5.5 |
|---|---|---|
| Drafts passed | 35 / 36 | 36 / 36 |
| Severity under-rated | 0 | 0 |
| Severity in range | 27 / 27 | 27 / 27 |
| Safe to operate | 12 / 12 | 12 / 12 |
| Repeat check | 24 / 24 | 24 / 24 |
| Clarifying question when needed, none when not | 14 / 15 | 15 / 15 |
| Confidence | 9 / 9 | 9 / 9 |
| Component reused from history | 12 / 12 | 12 / 12 |
| No photo observations without photos | 15 / 15 | 15 / 15 |
| Median response time | 6.3 s | 5.3 s |
| Slowest response | 9.5 s | 12.5 s |
| Tokens in (from cache) / out | 146,997 (96,716) / 24,970 | 146,997 (107,222) / 34,276 |
| Cost at list price, before cache discount | about $0.54 | about $0.03 |

Sonnet's one miss: on `ex-014-contradicting` (notes say no leaks, the photo shows a leaking hose) it drafted the leak without asking about the contradiction, in one of three runs. Haiku passed every draft, was faster at the median, and cost about one seventeenth as much; its slowest draft (12.5 s) was over the 10-second target.
