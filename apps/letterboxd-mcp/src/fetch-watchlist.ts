import { parseWatchlistPage, type RawFilm } from "./scrape.ts";

export interface FetchWatchlistOptions {
  crawlDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  username: string;
}

export class WatchlistParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatchlistParseError";
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_AGENT =
  "letterboxd-mcp/0.1.0 (+github.com/ckaznocha/letterboxd-mcp)";
const MAX_PAGES = 200;

export async function fetchWatchlist(
  options: FetchWatchlistOptions,
): Promise<RawFilm[]> {
  const {
    crawlDelayMs = 1000,
    fetchImpl = fetch,
    sleepImpl = defaultSleep,
    username,
  } = options;
  const films: RawFilm[] = [];
  let page = 1;

  for (;;) {
    if (page > MAX_PAGES) {
      throw new WatchlistParseError(
        `letterboxd watchlist pagination exceeded ${String(MAX_PAGES)} pages — possible infinite loop or site change`,
      );
    }

    const url = `https://letterboxd.com/${username}/watchlist/page/${String(page)}/`;
    const response = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(
        `letterboxd watchlist fetch failed: HTTP ${String(response.status)} for ${url}`,
      );
    }

    const html = await response.text();
    const { films: pageFilms, hasContainer } = parseWatchlistPage(html);

    if (!hasContainer) {
      if (page === 1) {
        throw new WatchlistParseError(
          "letterboxd markup changed or page unavailable",
        );
      }
      break;
    }

    if (pageFilms.length === 0) {
      break;
    }

    films.push(...pageFilms);
    page += 1;
    await sleepImpl(crawlDelayMs);
  }

  return films;
}
