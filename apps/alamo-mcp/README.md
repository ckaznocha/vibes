# alamo-mcp

[![npm](https://img.shields.io/npm/v/%40ckaznocha%2Falamo-mcp)](https://www.npmjs.com/package/@ckaznocha/alamo-mcp)

A standalone stdio MCP server exposing Alamo Drafthouse showtime data via the
unofficial `mother` schedule feed. **Does not book or purchase anything** —
Alamo Season Pass reservations are app-only per their Terms of Service, and
automating them risks account suspension. This server only surfaces data and
a booking deep link.

## Why

Alamo Drafthouse has no public showtimes API, so an LLM asked "what's playing
near me tonight" has no way to answer beyond guessing. This scrapes the same
unofficial JSON feed the drafthouse.com site itself calls, exposes it as
read-only tools, and stops there — it can hand back a booking link, but
booking always stays a human, in-app action.

## Tools

| Tool                                     | Purpose                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `list_cinemas(market?)`                  | Distinct cinemaIds in a market with sample sessions, to identify a theater id          |
| `get_sessions(market?, cinemaId?)`       | Normalized showtimes, optionally filtered to a cinemaId                                |
| `get_seatmap(sessionId)`                 | **Experimental** — seat availability for a session; requires `ALAMO_SEAT_URL_TEMPLATE` |
| `best_seats(sessionId, count?)`          | **Experimental** — top-scored available seats (center-of-house heuristic)              |
| `booking_url(market?, presentationSlug)` | Builds `https://drafthouse.com/{market}/show/{presentationSlug}` — a deep link only    |

## Finding a cinemaId

Run `list_cinemas` for your market and match the sample session titles/times
against a theater's public calendar to identify its `cinemaId`. There's no
env var to configure up front — pass `cinemaId` to `get_sessions` per call.
To compare showtimes across theaters, call `get_sessions` once per
`cinemaId`; omit `cinemaId` to get every cinema in the market in one call.

`get_sessions`' `sessionId` is a native id from the schedule feed when one is
present (checked as `sessionId` then `id`), otherwise it falls back to a
composite key of `cinemaId|showTimeClt|presentationSlug`. This fallback was
never confirmed against a live seat endpoint, so it may need adjusting once
the real seat-map API's expected session id format is known — see the next
section.

## The seat endpoint is unconfirmed

`ALAMO_SEAT_URL_TEMPLATE` has no working default — the real seat-map endpoint
was not confirmed at build time and must be reverse-engineered from a live
browser Network tab on a drafthouse.com seat-selection page (look for a
seats/seatmap call keyed by session id). Until you set it, `get_seatmap` and
`best_seats` return a clear "not configured" error.

## Config (env)

| Env                            | Default                                     |
| ------------------------------ | ------------------------------------------- |
| `ALAMO_MARKET`                 | `los-angeles`                               |
| `ALAMO_SCHEDULE_CACHE_TTL_SEC` | `300`                                       |
| `ALAMO_SEAT_URL_TEMPLATE`      | — (required for `get_seatmap`/`best_seats`) |

## Run

From a local clone of the `vibes` monorepo:

```sh
pnpm install
npx nx build alamo-mcp
node apps/alamo-mcp/dist/main.js
```

Or via npm, once published:

```sh
npx alamo-mcp
```

## MCP client config example

From a local clone:

```json
"alamo": {
  "command": "node",
  "args": ["/Users/<you>/src/github.com/ckaznocha/vibes/apps/alamo-mcp/dist/main.js"]
}
```

Or via npx, once published:

```json
"alamo": {
  "command": "npx",
  "args": ["-y", "alamo-mcp"]
}
```
