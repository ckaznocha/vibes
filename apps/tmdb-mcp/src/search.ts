import type { Movie, Person, Search, TMDB, TV } from "tmdb-ts";

export function searchMovies(
  client: TMDB,
  options: { page?: number; query: string; year?: number },
): Promise<Search<Movie>> {
  return client.search.movies(options);
}

export function searchMulti(
  client: TMDB,
  options: { page?: number; query: string },
): ReturnType<TMDB["search"]["multi"]> {
  return client.search.multi(options);
}

export function searchPeople(
  client: TMDB,
  options: { page?: number; query: string },
): Promise<Search<Person>> {
  return client.search.people(options);
}

export function searchTv(
  client: TMDB,
  options: { page?: number; query: string; year?: number },
): Promise<Search<TV>> {
  const { year, ...rest } = options;
  return client.search.tvShows(
    year === undefined ? rest : { ...rest, first_air_date_year: year },
  );
}
