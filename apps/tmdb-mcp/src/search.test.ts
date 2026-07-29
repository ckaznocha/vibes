import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { TMDB } from "tmdb-ts";

import { searchMovies, searchMulti, searchPeople, searchTv } from "./search.ts";

function makeResponse(body: unknown) {
  return { json: async () => body, ok: true } as Response;
}

describe("searchMovies", () => {
  it("passes query and year through to the movies search endpoint", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({
        page: 1,
        results: [{ id: 603 }],
        total_pages: 1,
        total_results: 1,
      }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await searchMovies(client, {
      query: "The Matrix",
      year: 1999,
    });

    assert.strictEqual(result.results[0]?.id, 603);
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/search/movie");
    assert.strictEqual(url.searchParams.get("query"), "The Matrix");
    assert.strictEqual(url.searchParams.get("year"), "1999");
  });
});

describe("searchTv", () => {
  it("maps year to first_air_date_year", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ page: 1, results: [], total_pages: 0, total_results: 0 }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await searchTv(client, { query: "Severance", year: 2022 });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.searchParams.get("first_air_date_year"), "2022");
    assert.strictEqual(url.searchParams.has("year"), false);
  });

  it("omits first_air_date_year when no year is given", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ page: 1, results: [], total_pages: 0, total_results: 0 }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await searchTv(client, { query: "Severance" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.searchParams.has("first_air_date_year"), false);
  });
});

describe("searchPeople", () => {
  it("hits the people search endpoint", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({
        page: 1,
        results: [{ id: 6193 }],
        total_pages: 1,
        total_results: 1,
      }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    const result = await searchPeople(client, { query: "Keanu Reeves" });

    assert.strictEqual(result.results[0]?.id, 6193);
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/search/person");
  });
});

describe("searchMulti", () => {
  it("hits the multi search endpoint", async () => {
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      makeResponse({ page: 1, results: [], total_pages: 0, total_results: 0 }),
    );
    const client = new TMDB("key123", { fetch: fetchImpl });

    await searchMulti(client, { query: "Matrix" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    const url = new URL(
      call.arguments[0] instanceof Request
        ? call.arguments[0].url
        : call.arguments[0],
    );
    assert.strictEqual(url.pathname, "/3/search/multi");
  });
});
