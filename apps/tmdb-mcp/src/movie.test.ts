import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { getMovieDetails } from "./movie.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("getMovieDetails", () => {
  it("fetches details for the given movie id", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 101, title: "Chrome Meridian" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await getMovieDetails(client, { movieId: 101 });

    assert.strictEqual(result.title, "Chrome Meridian");
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/movie/101");
    assert.strictEqual(url.searchParams.has("append_to_response"), false);
  });

  it("forwards appendToResponse and language", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ id: 101, title: "Chrome Meridian" }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await getMovieDetails(client, {
      appendToResponse: ["credits", "videos"],
      language: "en-US",
      movieId: 101,
    });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(
      url.searchParams.get("append_to_response"),
      "credits,videos",
    );
    assert.strictEqual(url.searchParams.get("language"), "en-US");
  });
});
