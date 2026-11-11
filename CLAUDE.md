@AGENTS.md

# Project conventions

Plant Defect Triage, a concept demo for a job interview. Requirements and plans are in `docs/` (latest: `requirements-v5.md`, `technical-plan-v2.md`, `data-model.md`, `milestones.md`).

## Where components go

- A component used by only one route lives in that route's folder, in a private `_components/` folder (for example `app/asset/[id]/_components/history-timeline.tsx`). The underscore keeps it out of routing.
- Only components shared by two or more routes go in the top-level `components/` folder.
- When a route-local component becomes needed by a second route, move it to `components/`.
- Route-only helpers follow the same rule (`_lib/` in the route folder); shared ones go in `lib/`.

## Theme

Light theme with black and yellow as accents (decided 11 Nov 2026; replaces the earlier all-dark theme). Colours are tokens in `app/globals.css`; use them through Tailwind utilities, never raw hex values in components.

- Page and cards are light: `bg-page`, `bg-surface`, `bg-surface-raised`, `border-line`, `text-text`, `text-text-muted`.
- Black (`ink`) is for strong accents: the header bar, primary buttons, focus outlines. Muted text on black is `text-ink-muted`.
- Yellow (`accent`) is for fills, bars, borders and highlights. Never use yellow as text on a light background (`text-accent` is only for text on `bg-ink`). Text on a yellow fill is `text-accent-ink`.
- Status and severity colours are always paired with a text label, never colour alone.

## Next.js and React best practices

Use the skills Vercel publishes, from the Vercel plugin:

- `vercel:nextjs` before writing or changing routes, layouts, Server Components, Server Actions, Route Handlers or caching.
- `vercel:react-best-practices` to review TSX components after editing them.

The bundled Next.js docs in `node_modules/next/dist/docs/` win over either skill where they disagree (see AGENTS.md). This app has Cache Components on: request-time data (database reads, `params`) must sit inside a `<Suspense>` boundary.

## Testing

| Kind | Tool | Where | Command |
|---|---|---|---|
| Unit | Vitest | `*.test.ts` next to the code | `pnpm test` |
| Component | Vitest + React Testing Library (jsdom) | `*.test.tsx` next to the component | `pnpm test` |
| End to end | Playwright, Chromium at desktop and 768px tablet widths | `e2e/*.spec.ts` | `pnpm test:e2e` |

- Put a test file next to the file it tests, including inside a route's `_components/`.
- Vitest cannot render async Server Components; cover them with Playwright.
- Query by role and accessible name in component and E2E tests, not by class or test ID.
- Before calling a step done, run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` when a screen changed.
