import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { getWatchlist } from "./get-watchlist.ts";

function nextResponse(responses: Response[]): Response {
  const response = responses.shift();
  assert.ok(
    response,
    "test setup provided fewer mock responses than fetch calls",
  );
  return response;
}

describe("getWatchlist", () => {
  it("rejects an invalid username before any network call", async () => {
    const fetchImpl = mock.fn<typeof fetch>();
    await assert.rejects(
      getWatchlist({ fetchImpl, username: "bad/name" }),
      /invalid letterboxd username/,
    );
    assert.strictEqual(fetchImpl.mock.calls.length, 0);
  });

  it("returns films scraped from the watchlist pages", async () => {
    const responses: Response[] = [
      {
        ok: true,
        text: async () =>
          `<div class="poster-list"><li class="poster-container"><div class="poster" data-target-link="/film/dune-part-two/" data-film-name="Dune: Part Two" data-film-release-year="2024"></div></li></div>`,
      } as Response,
      {
        ok: true,
        text: async () => `<div class="poster-list"></div>`,
      } as Response,
    ];
    const fetchImpl = mock.fn<typeof fetch>(async () =>
      nextResponse(responses),
    );

    const films = await getWatchlist({
      fetchImpl,
      sleepImpl: async () => {},
      username: "cliftonk",
    });

    assert.deepStrictEqual(films, [
      {
        letterboxdUrl: "https://letterboxd.com/film/dune-part-two/",
        slug: "dune-part-two",
        title: "Dune: Part Two",
        year: 2024,
      },
    ]);
  });
});
