<div align="center">

```
__      _______ ____  ______  _____
\ \    / /_   _|  _ \|  ____|/ ____|
 \ \  / /  | | | |_) | |__  | (___
  \ \/ /   | | |  _ <|  __|  \___ \
   \  /   _| |_| |_) | |____ ____) |
    \/   |_____|____/|______|_____/
```

**a little monorepo of little vibe-coded projects**

[![CI](https://github.com/ckaznocha/vibes/actions/workflows/ci.yml/badge.svg)](https://github.com/ckaznocha/vibes/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ckaznocha/vibes/actions/workflows/codeql.yml/badge.svg)](https://github.com/ckaznocha/vibes/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/ckaznocha/vibes/badge)](https://scorecard.dev/viewer/?uri=github.com/ckaznocha/vibes)

</div>

An [Nx](https://nx.dev) + pnpm monorepo where I ship small, standalone tools —
mostly stdio [MCP](https://modelcontextprotocol.io) servers — mostly written
by talking to an agent instead of hand-typing every line. Each app is
independently versioned and publishes to npm on its own; shared code lives in
`libs/*` and is never depended on across an app boundary unless it's
genuinely shared plumbing.

## Projects

<!-- projects:table:start -->

| Project                                     | Kind | Description                                                                                                                                     |
| ------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [`alamo-mcp`](apps/alamo-mcp)               | app  | Standalone stdio MCP server exposing Alamo Drafthouse showtimes, theater listings, seat maps, and a booking deep link (never books anything).   |
| [`gen-readme-table`](apps/gen-readme-table) | app  | Internal dev tool that regenerates the project table in the root README.md from Nx project metadata.                                            |
| [`honcho-mcp`](apps/honcho-mcp)             | app  | Standalone stdio MCP server exposing a self-hosted Honcho memory instance: search, dialectic chat, context/representation, and conclusion CRUD. |
| [`letterboxd-mcp`](apps/letterboxd-mcp)     | app  | Standalone stdio MCP server that scrapes a Letterboxd user's public watchlist.                                                                  |
| [`tmdb-mcp`](apps/tmdb-mcp)                 | app  | Standalone stdio MCP server exposing The Movie Database (TMDB) lookups.                                                                         |
| [`mcp-tool-result`](libs/mcp-tool-result)   | lib  | Shared helpers for wrapping MCP tool handler results and errors in the SDK's response shape.                                                    |
| [`resilient-fetch`](libs/resilient-fetch)   | lib  | Retry, circuit-breaking, and concurrency/rate throttling for outbound fetch calls and arbitrary async SDK calls.                                |

<!-- projects:table:end -->

This table is generated — don't hand-edit it. Run `pnpm run docs:table` after
adding, removing, or re-describing a project (also runs automatically on
commit via lefthook whenever a `project.json` or `package.json` changes). See
each project's own `README.md` (linked above) for its usage and configuration.

## Setup

```sh
# Install dependencies
pnpm install

# Build, lint, test, and typecheck everything
pnpm exec nx run-many -t build,lint,test,typecheck

# Run a single target for one project
pnpm exec nx build <project>
pnpm exec nx test <project>

# Only run what's affected by your changes
pnpm exec nx affected -t test
```

Requires Node >=24 and pnpm (see `packageManager` in `package.json`). Git
hooks (formatting, linting, affected tests) run via
[lefthook](https://github.com/evilmartians/lefthook) — installed
automatically by `pnpm install`.

## Releases

Nothing here is published yet. Once a project is ready, it gets tagged
`publish:npm` and released independently: pushing a `<project>@vX.Y.Z` git
tag triggers that project's publish job in CI (see `.github/workflows/release.yml`).
