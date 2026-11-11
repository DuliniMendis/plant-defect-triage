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

Breakdown at checkpoint 1: messages 92,768; system tools 17,575; MCP tools 16,632; system prompt 12,715; skills 9,964; MCP server instructions 1,261.

Checkpoint 3 is from a second session (Claude Opus 5.5), so its context count starts fresh rather than adding to checkpoints 1 and 2.

Checkpoint 4 is from a third session (Claude Opus 5.5). Its 5-hour figure is account-wide, so it includes the M2 and M3 sessions running at the same time.

Checkpoint 5 is from a fourth session (Claude Opus 5.5, in a worktree for DUL-7), so its context count starts fresh. Its 5-hour figure is account-wide, so it includes the M1 and M2 sessions running at the same time.

Checkpoint 6 is from a fifth session (Claude Opus 5.5, in a worktree for DUL-8 cut from the M3 branch), so its context count starts fresh. Its 5-hour figure is account-wide, so it includes other sessions running at the same time.
