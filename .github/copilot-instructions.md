This is an Nx + pnpm monorepo. `apps/*` are independent, standalone stdio MCP
(Model Context Protocol) servers; `libs/*` are shared TS-source-only
libraries. Module boundaries are enforced by `@nx/enforce-module-boundaries`
in the root `eslint.config.ts`, driven by tags in each project's
`project.json` — see `CLAUDE.md` / `AGENTS.md` for the full tag taxonomy and
"adding a new project" checklist; don't duplicate that reference here, keep
this file in sync with it instead.

## Apps

- `apps/letterboxd-mcp`: one tool, `get_watchlist`, scraping a Letterboxd
  user's public watchlist. No TMDB enrichment — that's `tmdb-mcp`'s job.
- `apps/alamo-mcp`: five tools (`list_cinemas`, `get_sessions`,
  `get_seatmap`, `best_seats`, `booking_url`) exposing Alamo Drafthouse
  showtime data. Never books or purchases anything — Alamo Season Pass
  reservations are app-only per Alamo's Terms of Service, and automating
  purchases risks account suspension; `booking_url` only builds a deep link,
  do not add any tool that submits a reservation. `get_seatmap`/`best_seats`
  are deliberately experimental: the real seat endpoint was never confirmed
  live, so they require an explicit `ALAMO_SEAT_URL_TEMPLATE` and fail
  loudly (a distinct, named error) rather than guessing at a default or
  returning a silent empty/fake result. Preserve that behavior in any
  change to those tools.
- `apps/tmdb-mcp`: TMDB search/details/watch-providers/trending lookups.
  The one place TMDB API logic lives in this workspace — other projects
  needing a TMDB id call this server rather than growing their own client.
- `apps/honcho-mcp`: exposes a self-hosted Honcho memory instance
  (search/chat/context/conclusions) over stdio, for MCP clients that can't
  use the `plastic-labs/claude-honcho` Claude Code plugin.

## Libs

- `libs/mcp-tool-result`: wraps a tool handler's return value or caught
  error into the MCP SDK's `content`-array response shape (`toolResult`,
  `toolError`). Used by every app.
- `libs/resilient-fetch`: retry-with-backoff, circuit breaker, per-attempt
  timeout, and concurrency/rate throttling for outbound calls
  (`createResilientFetch` for anything with a `fetch` seam,
  `createResilientExecutor` for SDK calls that don't). Used by every app.

Only extract shared logic into `libs/*` when the _concern_ is genuinely
shared across projects, not just similarly shaped — see item 11 in
`CLAUDE.md`'s "Adding a new project" section for the litmus test before
creating a new one.

## Conventions

Within each app, every other source file has one narrow responsibility and
is composed at `src/main.ts`. Prefer pure, dependency-injected functions
(`fetchImpl`, `sleepImpl`) over reaching for globals, so behavior stays
testable without live network calls.

Third-party libraries are added only when they earn their keep. Prefer
Node's built-ins (`node:test`, `node:assert/strict`, native `fetch`) over
adding a new dependency for something the standard library already covers.

Tests use `node --test` (native, no test framework dependency) and must
never make live network calls — inject `fetchImpl`/`sleepImpl` and assert on
realistic fixtures instead of mocking implementation details. Each project's
tests live under its own `src/`, wired as that project's Nx `test` target —
run `pnpm exec nx test <project>` or `pnpm exec nx affected -t test` rather
than a bare `node --test` from the workspace root, since the latter would
try to run every project's suite without Nx's per-project scoping.
