# letterboxd-mcp

[![npm](https://img.shields.io/npm/v/%40ckaznocha%2Fletterboxd-mcp)](https://www.npmjs.com/package/@ckaznocha/letterboxd-mcp)

A standalone stdio MCP server that scrapes a Letterboxd user's public watchlist.

## Why

Letterboxd has no public watchlist API or RSS feed. This scrapes the public
`letterboxd.com/{username}/watchlist/page/{n}/` HTML pages.

## Tool

| Tool                      | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `get_watchlist(username)` | Returns `{ films: [{ title, year, slug, letterboxdUrl }] }` |

Titles/years are returned as scraped from Letterboxd, with no TMDB enrichment
in this server — use [`tmdb-mcp`](../tmdb-mcp)'s `search_movies` tool to
resolve a TMDB id per title if needed.

## Config (env)

| Env                         | Default |
| --------------------------- | ------- |
| `LETTERBOXD_CRAWL_DELAY_MS` | `1000`  |

## Run

From a local clone of the `vibes` monorepo:

```sh
pnpm install
npx nx build letterboxd-mcp
node apps/letterboxd-mcp/dist/main.js
```

Or via npm, once published:

```sh
npx letterboxd-mcp
```

## MCP client config example

From a local clone:

```json
"letterboxd": {
  "command": "node",
  "args": ["/Users/<you>/src/github.com/ckaznocha/vibes/apps/letterboxd-mcp/dist/main.js"]
}
```

Or via npx, once published:

```json
"letterboxd": {
  "command": "npx",
  "args": ["-y", "letterboxd-mcp"]
}
```
