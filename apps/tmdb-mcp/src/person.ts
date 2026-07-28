import type { AppendToResponsePersonKey, PersonDetails, TMDB } from "tmdb-ts";

export function getPersonDetails(
  client: TMDB,
  options: {
    appendToResponse?: AppendToResponsePersonKey[];
    language?: string;
    personId: number;
  },
): Promise<PersonDetails> {
  return client.people.details(
    options.personId,
    options.appendToResponse,
    options.language,
  );
}
