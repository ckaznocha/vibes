import type { CountryCode, TMDB, WatchProviderResult } from "tmdb-ts";

export function getWatchProviders(
  client: TMDB,
  options: { mediaType: "movie" | "tv"; region?: string },
): Promise<WatchProviderResult> {
  const providerOptions =
    options.region === undefined
      ? undefined
      : { watch_region: options.region as CountryCode };
  return options.mediaType === "movie"
    ? client.watchProviders.getMovieProviders(providerOptions)
    : client.watchProviders.getTvProviders(providerOptions);
}
