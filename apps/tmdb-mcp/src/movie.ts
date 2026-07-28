import type { AppendToResponseMovieKey, MovieDetails, TMDB } from "tmdb-ts";

export function getMovieDetails(
  client: TMDB,
  options: {
    appendToResponse?: AppendToResponseMovieKey[];
    language?: string;
    movieId: number;
  },
): Promise<MovieDetails> {
  return client.movies.details(
    options.movieId,
    options.appendToResponse,
    options.language,
  );
}
