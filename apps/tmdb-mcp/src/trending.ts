import type { TimeWindow, TMDB, TrendingMediaType } from "tmdb-ts";

export function getTrending(
  client: TMDB,
  options: { mediaType: TrendingMediaType; timeWindow: TimeWindow },
): ReturnType<TMDB["trending"]["trending"]> {
  return client.trending.trending(options.mediaType, options.timeWindow);
}
