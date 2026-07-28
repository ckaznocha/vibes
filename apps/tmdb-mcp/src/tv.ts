import type { AppendToResponseTvKey, TMDB, TvShowDetails } from "tmdb-ts";

export function getTvDetails(
  client: TMDB,
  options: {
    appendToResponse?: AppendToResponseTvKey[];
    language?: string;
    tvId: number;
  },
): Promise<TvShowDetails> {
  return client.tvShows.details(
    options.tvId,
    options.appendToResponse,
    options.language,
  );
}
