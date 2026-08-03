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

| Tool                                      | Purpose                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `list_cinemas(market?)`                   | Theaters in a market — cinemaId, name, address, coordinates, sample sessions        |
| `get_sessions(market?, cinemaId?)`        | Normalized showtimes, optionally filtered to a cinemaId                             |
| `get_seatmap(cinemaId, sessionId)`        | Every seat for a session with row, grid position, status, and style                 |
| `best_seats(cinemaId, sessionId, count?)` | Top-scored available seats (center-of-house heuristic)                              |
| `booking_url(market?, presentationSlug)`  | Builds `https://drafthouse.com/{market}/show/{presentationSlug}` — a deep link only |

## Finding a cinemaId

Run `list_cinemas` for your market — it returns each theater's `cinemaId`
alongside its real name, street address, coordinates, timezone, and how many
sessions it currently has scheduled, so no guesswork is needed to tell
theaters apart. Theaters with nothing scheduled are included with
`sessionCount: 0`. There's no env var to configure up front — pass `cinemaId`
to `get_sessions` per call. To compare showtimes across theaters, call
`get_sessions` once per `cinemaId`; omit `cinemaId` to get every cinema in
the market in one call.

Note that markets vary in size: some contain a single theater, others
several. `list_cinemas` reports whatever the market's feed returns, so run it
against your own market rather than assuming a count.

Cinema metadata is parsed leniently: if the feed's `data.market` block ever
drifts, `list_cinemas` falls back to bare `cinemaId`s plus sample sessions
rather than failing the call outright.

`get_sessions`' `sessionId` is a native id from the schedule feed when one is
present (checked as `sessionId` then `id`), otherwise it falls back to a
composite key of `cinemaId|showTimeClt|presentationSlug`. Live feed sessions
do carry a native `sessionId`, and it is exactly the id the seat endpoint
expects — drafthouse.com's own seat-selection page keys off the same value —
so the composite fallback is defensive only, and a session that hits it won't
work with `get_seatmap`.

## Seat maps

`get_seatmap` and `best_seats` call
`GET /s/mother/v1/app/seats/{cinemaId}/{sessionId}`, the same endpoint
drafthouse.com's own seat-selection page uses. It needs no auth, cookie, or
session priming — the site sends a `userSessionId` query param, but the
response is identical without it. Both path params come straight off a
`get_sessions` entry, so pass the `cinemaId` and `sessionId` from the same
session.

Seat status maps from upstream as `EMPTY` → available and `SOLD`/`BROKEN` →
unavailable. Grid cells that aren't seats (aisles, gaps) are omitted, as is
any seat carrying a status this server doesn't recognize — an unknown status
is never reported as available.

`best_seats` scores by distance from the center of the house: horizontally
centered, about two-thirds of the way back from the screen, using the row and
column indices upstream provides. Lower score is better.

Neither tool holds, reserves, or books a seat — see the safety note at the
top. `ALAMO_SEAT_URL_TEMPLATE` can override the endpoint (`{cinemaId}` and
`{sessionId}` are substituted) if upstream ever moves it, but it is not
required.

## Config (env)

| Env                            | Default                                |
| ------------------------------ | -------------------------------------- |
| `ALAMO_MARKET`                 | `austin`                               |
| `ALAMO_SCHEDULE_CACHE_TTL_SEC` | `300`                                  |
| `ALAMO_SEAT_URL_TEMPLATE`      | the live seat endpoint (override only) |

## Run

From a local clone of the `vibes` monorepo:

```sh
pnpm install
npx nx build alamo-mcp
node apps/alamo-mcp/dist/main.js
```

Or via npm, once published:

```sh
npx -y @ckaznocha/alamo-mcp
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
  "args": ["-y", "@ckaznocha/alamo-mcp"]
}
```
