import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { getTrending } from "./trending.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("getTrending", () => {
  it("hits the trending endpoint for the given media type and time window", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ page: 1, results: [], total_pages: 0, total_results: 0 }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getTrending(client, { mediaType: "movie", timeWindow: "week" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(call.arguments[0]);
    assert.strictEqual(url.pathname, "/3/trending/movie/week");
  });
});
