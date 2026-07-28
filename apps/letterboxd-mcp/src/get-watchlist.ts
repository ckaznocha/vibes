import type { Film } from "./types.ts";

import { fetchWatchlist } from "./fetch-watchlist.ts";
import { assertValidUsername } from "./validate.ts";

export interface GetWatchlistOptions {
  crawlDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  username: string;
}

export async function getWatchlist(
  options: GetWatchlistOptions,
): Promise<Film[]> {
  const { crawlDelayMs, fetchImpl, sleepImpl, username } = options;

  assertValidUsername(username);

  const rawFilms = await fetchWatchlist({
    username,
    ...(crawlDelayMs !== undefined && { crawlDelayMs }),
    ...(fetchImpl !== undefined && { fetchImpl }),
    ...(sleepImpl !== undefined && { sleepImpl }),
  });

  return rawFilms.map((raw) => ({
    letterboxdUrl: `https://letterboxd.com/film/${raw.slug}/`,
    slug: raw.slug,
    title: raw.title,
    year: raw.year,
  }));
}
