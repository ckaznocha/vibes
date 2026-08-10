import { TMDB } from "tmdb-ts";

const clientCache: { apiKey: string | undefined; client: TMDB | undefined } = {
  apiKey: undefined,
  client: undefined,
};

/**
 * Test-only: clears the cached TMDB client so tests can start fresh.
 */
export function _resetTmdbClientCacheForTests(): void {
  clientCache.client = undefined;
  clientCache.apiKey = undefined;
}

/**
 * Returns a TMDB client, created once per apiKey and reused across calls for
 * the lifetime of the process.
 */
export function getTmdbClient(apiKey: string, fetchImpl?: typeof fetch): TMDB {
  if (!clientCache.client || clientCache.apiKey !== apiKey) {
    clientCache.client = new TMDB(
      apiKey,
      fetchImpl ? { fetch: fetchImpl } : undefined,
    );
    clientCache.apiKey = apiKey;
  }
  return clientCache.client;
}
