import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { getWatchProviders } from "./watch-providers.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("getWatchProviders", () => {
  it("hits the movie providers endpoint for mediaType movie", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ results: {} }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getWatchProviders(client, { mediaType: "movie" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(call.arguments[0]);
    assert.strictEqual(url.pathname, "/3/watch/providers/movie");
  });

  it("hits the tv providers endpoint for mediaType tv, forwarding region", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ results: {} }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getWatchProviders(client, { mediaType: "tv", region: "US" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(call.arguments[0]);
    assert.strictEqual(url.pathname, "/3/watch/providers/tv");
    assert.strictEqual(url.searchParams.get("watch_region"), "US");
  });
});
