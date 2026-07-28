---
name: project-conventions
description: Source-layout, testing, and safety conventions for MCP-server projects in this workspace (tagged type:mcp-server / data-source:scraping / safety:*). Load automatically when editing files under any such project's src/.
user-invocable: false
---

# Conventions for `type:mcp-server` projects

Every project tagged `type:mcp-server` (run `nx show projects -p "tag:type:mcp-server"
--json` for the live list — currently `letterboxd-mcp`, `alamo-mcp`, `tmdb-mcp`, and
`honcho-mcp`, but don't assume this list is exhaustive or stays fixed) is a standalone stdio MCP server
built with `@modelcontextprotocol/sdk` + `zod`. Projects also tagged `publish:npm` ship
independently to npm (see the `cut-release` skill); those tagged `data-source:scraping`
parse uncontracted third-party HTML/JSON. Keep new code in any of these consistent with
the conventions below rather than introducing new patterns per-project.

## Shared logic goes in `libs/*`, but only when it's genuinely shared

Before implementing new logic here, check whether it already exists in a sibling
`type:mcp-server` project or an existing `libs/*` package (grep, don't assume) — see the
`new-mcp-tool` skill's first step and CLAUDE.md's "Adding a new project" item 11 for the
full process and the litmus test on when to actually extract to a `scope:shared` lib
(most MCP-response-formatting-style plumbing qualifies, like `libs/mcp-tool-result`; logic
that's the specific reason one project exists usually doesn't — a sibling project should
call it as a tool instead of importing its internals). Use the `new-lib` skill to scaffold
a new one.

## Network calls: retry, circuit-breaking, and throttling go through `resilient-fetch`

Any outbound call to an external API or scraped site — a raw `fetch()`, or an SDK client
call with no `fetch` injection point (e.g. `@honcho-ai/sdk`) — must go through the shared
`resilient-fetch` lib (`libs/resilient-fetch`) rather than hand-rolling retry/backoff or
calling the network directly. Don't add a one-off `try`/retry loop or a different retry
package (e.g. `p-retry`, `exponential-backoff`) per project — this is exactly the kind of
plumbing every `type:mcp-server` project needs alike, the same reasoning as
`libs/mcp-tool-result`.

- If the call site already takes a `fetchImpl?: typeof fetch` parameter (the existing
  pattern in every fetch-based client here, used for testability), wrap it at the
  `main.ts` call site: `const fetchImpl = createResilientFetch({ throttle: {...} })`,
  then pass `fetchImpl` in instead of leaving it defaulted to the global `fetch`. See
  `apps/tmdb-mcp/src/main.ts` or `apps/alamo-mcp/src/main.ts` for the pattern.
- If there's no fetch injection point (an SDK client method), wrap the call itself with
  `createResilientExecutor()` at the call site instead — see `apps/honcho-mcp/src/main.ts`
  (the `execute(() => ...)` wrapper around every Honcho SDK call).
- Tune `throttle.concurrency`/`intervalCap`/`intervalMs` to the target API's actual
  documented (or reasonably assumed, for undocumented/scraped sources) rate limit — don't
  leave every project on the same defaults without thinking about it; see the per-app
  comments next to each `createResilientFetch`/`createResilientExecutor` call for the
  reasoning already recorded for each existing project.

## File layout

- One concern per file in `src/`: `src/x.ts` implements one thing, `src/x.test.ts` tests
  it. There are no `__tests__/` directories or grouped test files — every source file that
  has meaningful logic gets its own co-located `.test.ts`.
- `main.ts` is the MCP server entrypoint/wiring only; business logic lives in the other
  files so it's unit-testable without spinning up the MCP transport.
- **Projects tagged `data-source:scraping`**: third-party response fixtures (scraped HTML,
  JSON API payloads) live in `src/fixtures/` as static files, not inlined in test source.
  Include at least one _malformed_ fixture per external data shape the code parses (e.g.
  `watchlist-malformed.html`, `schedule-malformed.json`) — the malformed-input test is what
  proves the parser fails closed instead of throwing an unhandled exception or emitting
  garbage. The `regen-fixture` skill checks a project's live source against its fixtures
  for drift.

## Testing

- Test runner is Node's built-in `node --test` (see each project's `project.json` `test`
  target), not Jest or Vitest — don't add either as a dependency or reach for
  Jest/Vitest-only APIs.
- `nx run <project>:typecheck` runs `tsc -p tsconfig.spec.json --noEmit`, which includes
  test files — a change that breaks type-checking in a `.test.ts` file fails CI the same as
  a break in `src/`.

## Safety invariants

- **Projects tagged `safety:link-only`** (currently `alamo-mcp`) must never perform the
  state-changing action they link to — `alamo-mcp` only returns a booking deep link
  (`booking-url.ts`) for the user to complete themselves in a browser; it never submits a
  booking. Any change that would make a `safety:link-only` project perform the action
  itself, rather than just link to it, is out of scope and should be flagged, not
  implemented. Check a project's tags (`nx show project <project> --json | jq .tags`)
  before assuming this constraint does or doesn't apply.
- **Projects tagged `data-source:scraping`** parse data with no stable contract. Treat
  upstream markup/schema drift as expected, not exceptional — new parsing code should fail
  closed (return empty/undefined, not throw) on unexpected shapes, matching the existing
  `*-malformed*` fixture tests.

## Lint

- `eslint-plugin-security`, `sonarjs`, and `unicorn` recommended configs are all enabled
  workspace-wide (`eslint.config.ts`) — don't disable a rule inline to silence a warning;
  fix the code, or if the rule is genuinely wrong for this codebase, change it in
  `eslint.config.ts` with a comment explaining why (see the existing
  `unicorn/no-null` and `security/detect-non-literal-fs-filename` overrides for the
  pattern).
- `@nx/enforce-module-boundaries` constrains `type:mcp-server` projects to only depend on
  other `type:mcp-server` or `type:lib` projects, and `scope:<project>`-tagged code to its
  own scope — don't add a cross-project import without first checking whether the target's
  tags actually allow it.
