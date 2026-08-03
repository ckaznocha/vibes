import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { findByExternalId } from "./find-by-external-id.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("findByExternalId", () => {
  it("looks up by imdb id", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({
        movie_results: [{ id: 101 }],
        person_results: [],
        tv_episode_results: [],
        tv_results: [],
        tv_season_results: [],
      }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await findByExternalId(client, {
      externalId: "tt0133093",
      source: "imdb_id",
    });

    assert.strictEqual(result.movie_results[0]?.id, 101);
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/find/tt0133093");
    assert.strictEqual(url.searchParams.get("external_source"), "imdb_id");
  });
});
