import type { ExternalSource, FindResult, TMDB } from "tmdb-ts";

export function findByExternalId(
  client: TMDB,
  options: { externalId: string; source: ExternalSource },
): Promise<FindResult> {
  return client.find.byExternalId(options.externalId, {
    external_source: options.source,
  });
}
