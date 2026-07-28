# tmdb-mcp

A standalone stdio MCP server exposing [The Movie Database](https://www.themoviedb.org/)
(TMDB) lookups: search, details, watch providers, cross-referencing by external id, and
trending.

## Why

TMDB has a large REST API, not an MCP server, so an agent working with movie/
TV/person data needs something translating "find this title" or "who else
was in this" into the right endpoint and request shape. This is the one
place in the workspace that TMDB logic lives — any project needing a TMDB
id, poster, credit, or watch-provider lookup calls this server rather than
each growing its own TMDB client.

## Tools

| Tool                                                         | Purpose                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `search_movies(query, year?, page?)`                         | Search movies by title                                                               |
| `search_tv(query, year?, page?)`                             | Search TV shows by title                                                             |
| `search_people(query, page?)`                                | Search actors, directors, and other people                                           |
| `search_multi(query, page?)`                                 | Search movies, TV, and people in one call — for when the media type is ambiguous     |
| `get_movie_details(movieId, appendToResponse?, language?)`   | Movie details, optionally with credits/videos/recommendations/similar/etc. folded in |
| `get_tv_details(tvId, appendToResponse?, language?)`         | TV show details, same append-to-response options as movies                           |
| `get_person_details(personId, appendToResponse?, language?)` | Person details, optionally with movie/tv/combined credits, external ids, images      |
| `get_watch_providers(mediaType, region?)`                    | Streaming/rental/purchase providers TMDB knows about, by region (JustWatch)          |
| `find_by_external_id(externalId, source)`                    | Look up a movie/TV/person by an id from another source (e.g. an IMDb id)             |
| `get_trending(mediaType, timeWindow)`                        | Trending movies/TV/people, daily or weekly                                           |

`appendToResponse` mirrors TMDB's own
[append_to_response](https://developer.themoviedb.org/docs/append-to-response) parameter —
use it to fold credits, videos, recommendations, similar titles, external ids, watch
providers, etc. into a single `get_*_details` call instead of a separate tool round trip.

## Config (env)

| Env            | Default                                       |
| -------------- | --------------------------------------------- |
| `TMDB_API_KEY` | — (required; v4 read-access token, see below) |

`TMDB_API_KEY` must be a TMDB **v4 read-access token** (a long JWT, from
https://www.themoviedb.org/settings/api — "API Read Access Token", not the shorter v3
"API Key"), sent as a Bearer token.

## Run

From a local clone of the `vibes` monorepo:

```sh
pnpm install
npx nx build tmdb-mcp
node apps/tmdb-mcp/dist/main.js
```

## MCP client config example

```json
"tmdb": {
  "command": "node",
  "args": ["/Users/<you>/src/github.com/ckaznocha/vibes/apps/tmdb-mcp/dist/main.js"],
  "env": { "TMDB_API_KEY": "..." }
}
```
