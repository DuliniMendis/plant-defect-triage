# Usage log

Checkpoints of this Claude session's usage, recorded for the build log page.

What these numbers are: the size of the session's context window at that moment (everything the model is holding, including tool definitions), and the share of the Claude Max plan's 5-hour limit used. They are not a per-prompt count of tokens billed; the app does not expose that to the session.

Session: Claude Fable 5.2, medium effort, auto permission mode, 1M-token context window.

| # | When (11 Nov 2026) | After | Context tokens | Context used | 5-hour limit used |
|---|---|---|---|---|---|
| 1 | Planning complete | Research, ideation, scaffold, requirements v1 and v2, technical plan | 151,206 | 15% | 2% |
| 2 | Planning revised | Database change (requirements v3, plan v2), UML data model, decisions on fleet, styling, privacy and photos, photo search and three generated images | 207,228 | 21% | 6% |
| 3 | Scaffolding set up (new session) | Dependency swap, database schema and first migration, theme, app shell, disclaimer footer, README, NOTICE, placeholder routes | 149,154 | 15% | 11% |
| 4 | M1 Asset list (DUL-5, new session) | Seed script and data, fleet page, tests; Vercel project linked and Neon installed (Sydney); migration and seed run against Neon | 178,874 | 18% | 19% |
| 5 | M3 defect capture built (new session, worktree) | Capture panel with photo picker, drag and drop, browser resize, notes and validation; unit, component and E2E tests | 177,909 | 18% | 21% |
| 6 | M4 work order from issue built (new session, worktree off M3) | Issue and work order form, POST /api/work-orders with one transaction and photo clean-up, photo store (local stand-in until Blob is enabled), photo route, stand-in history list, data model draft 2; unit, component and E2E tests | 240,177 | 24% | 33% |
| 7 | M8 QR code lookup (DUL-12, new session) | QR image script and 24 saved codes, "Upload QR code" on the fleet page with error messages, unit, component and E2E tests | 175,425 | 18% | 32% |
| 8 | M6 AI fills the form (DUL-10, new session, worktree) | POST /api/triage with structured output through AI Gateway, prompt caching (system prompt and asset history), server fill of priority, out of service, parts and hours from rules and records; "Draft with AI" with progress, AI findings, retry and fill by hand; unit, component and E2E tests; live model checks | 297,984 | 30% | 42% |
| 9 | M7 AI repeat check and clarifying question (DUL-11, new session, worktree) | Repeat finding with links that highlight the matching history entries; clarifying question with answer and re-draft; unclear sample photo; prompt rules tightened after live checks; unit, component and E2E tests | 199,940 | 20% | 46% |
| 10 | M9 evals, NOTICE and README (DUL-13, DUL-64, new session, worktree) | Eval cases, scorer and `pnpm eval` runner; first Sonnet 5.5 vs Haiku 5.5 run (24 live calls); NOTICE licences and services; README evals section; Linear tasks DUL-64 and DUL-65 | 175,471 | 18% | 47% |
| 11 | M5 speech to text (DUL-9, new session, worktree off M3) | Dictate button using Chrome SpeechRecognition, transcript appended to the notes box, listening indicator, blocked-mic and unsupported-browser messages (button disabled with a Chrome hint); Linear sub-tasks for M1 to M5 and M8 closed; main merged in; unit, component and E2E tests | 228,551 | 23% | 42% |

Breakdown at checkpoint 1: messages 92,768; system tools 17,575; MCP tools 16,632; system prompt 12,715; skills 9,964; MCP server instructions 1,261.

Checkpoint 3 is from a second session (Claude Opus 5.5), so its context count starts fresh rather than adding to checkpoints 1 and 2.

Checkpoint 4 is from a third session (Claude Opus 5.5). Its 5-hour figure is account-wide, so it includes the M2 and M3 sessions running at the same time.

Checkpoint 5 is from a fourth session (Claude Opus 5.5, in a worktree for DUL-7), so its context count starts fresh. Its 5-hour figure is account-wide, so it includes the M1 and M2 sessions running at the same time.

Checkpoint 6 is from a fifth session (Claude Opus 5.5, in a worktree for DUL-8 cut from the M3 branch), so its context count starts fresh. Its 5-hour figure is account-wide, so it includes other sessions running at the same time.

Checkpoint 7 is from another session (Claude Opus 5.5, worktree for DUL-12). Its 5-hour figure is account-wide and includes other milestone sessions running at the same time.

Checkpoint 8 is from another session (Claude Opus 5.5, worktree for DUL-10). Its 5-hour figure is account-wide. Three live triage calls were made to Claude Sonnet 5.5 through AI Gateway during this milestone; the second call of the pair read 3,076 prompt tokens from cache.

Checkpoint 9 is from another session (Claude Opus 5.5, worktree for DUL-11). Its 5-hour figure is account-wide. Six live triage calls were made to Claude Sonnet 5.5 through AI Gateway on EX-014 (clear photo, unclear photo, unclear photo with an answer, run twice). The first run showed the model claiming a repeat while still asking where the leak was, and asking for a new photo after the answer; two prompt rules were added and the second run behaved as required.
Checkpoint 10 is from another session (Claude Opus 5.5, worktree for DUL-13). Its 5-hour figure is account-wide. The eval run made 26 live triage calls through AI Gateway (2 for a smoke test, 24 for the full run), about $0.21 at list price.

Checkpoint 11 is from another session (Claude Opus 5.5, worktree for DUL-9 cut from the M3 branch before M3 merged). Its 5-hour figure is account-wide and includes other milestone sessions running at the same time.
