import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { fetchWatchlist, WatchlistParseError } from "./fetch-watchlist.ts";

const NORMAL_PAGE_HTML = `
<div class="poster-list">
  <li class="poster-container">
    <div class="poster film-poster" data-target-link="/film/chrome-meridian/" data-film-name="Chrome Meridian" data-film-release-year="2021"></div>
  </li>
</div>`;

const EMPTY_CONTAINER_HTML = `<div class="poster-list"></div>`;

const MALFORMED_HTML = `<div class="error-page"></div>`;

function makeResponse(html: string, ok = true, status = 200) {
  return { ok, status, text: async () => html } as Response;
}

function nextResponse(responses: Response[]): Response {
  const response = responses.shift();
  assert.ok(
    response,
    "test setup provided fewer mock responses than fetch calls",
  );
  return response;
}

describe("fetchWatchlist", () => {
  it("paginates until an empty container page and concatenates films", async () => {
    const responses = [
      makeResponse(NORMAL_PAGE_HTML),
      makeResponse(EMPTY_CONTAINER_HTML),
    ];
    const fetchImpl = mock.fn(async () => nextResponse(responses));
    const sleepImpl = mock.fn(async () => {});

    const films = await fetchWatchlist({
      crawlDelayMs: 42,
      fetchImpl,
      sleepImpl,
      username: "cliftonk",
    });

    assert.deepStrictEqual(films, [
      { slug: "chrome-meridian", title: "Chrome Meridian", year: 2021 },
    ]);
    assert.strictEqual(fetchImpl.mock.calls.length, 2);
    const [firstFetchCall, secondFetchCall] = fetchImpl.mock.calls;
    assert.ok(firstFetchCall);
    assert.ok(secondFetchCall);
    assert.deepStrictEqual(firstFetchCall.arguments, [
      "https://letterboxd.com/cliftonk/watchlist/page/1/",
      {
        headers: {
          "User-Agent":
            "letterboxd-mcp/0.1.0 (+github.com/ckaznocha/letterboxd-mcp)",
        },
      },
    ]);
    assert.deepStrictEqual(secondFetchCall.arguments, [
      "https://letterboxd.com/cliftonk/watchlist/page/2/",
      {
        headers: {
          "User-Agent":
            "letterboxd-mcp/0.1.0 (+github.com/ckaznocha/letterboxd-mcp)",
        },
      },
    ]);
    const [sleepCall] = sleepImpl.mock.calls;
    assert.ok(sleepCall);
    assert.deepStrictEqual(sleepCall.arguments, [42]);
  });

  it("throws WatchlistParseError after exceeding the page cap instead of looping forever", async () => {
    const fetchImpl = mock.fn(async () => makeResponse(NORMAL_PAGE_HTML));
    const sleepImpl = mock.fn(async () => {});

    await assert.rejects(
      fetchWatchlist({ fetchImpl, sleepImpl, username: "cliftonk" }),
      /pagination exceeded 200 pages/,
    );
    await assert.rejects(
      fetchWatchlist({ fetchImpl, sleepImpl, username: "cliftonk" }),
      WatchlistParseError,
    );
  });

  it("throws WatchlistParseError when page 1 has no recognizable container", async () => {
    const fetchImpl = mock.fn(async () => makeResponse(MALFORMED_HTML));
    const sleepImpl = mock.fn(async () => {});

    await assert.rejects(
      fetchWatchlist({ fetchImpl, sleepImpl, username: "cliftonk" }),
      WatchlistParseError,
    );
  });

  it("throws a plain error on non-2xx response", async () => {
    const fetchImpl = mock.fn(async () => makeResponse("", false, 404));
    const sleepImpl = mock.fn(async () => {});

    await assert.rejects(
      fetchWatchlist({ fetchImpl, sleepImpl, username: "cliftonk" }),
      /HTTP 404/,
    );
  });

  it("returns an empty list for a genuinely empty watchlist (page 1 has container, no films)", async () => {
    const fetchImpl = mock.fn(async () => makeResponse(EMPTY_CONTAINER_HTML));
    const sleepImpl = mock.fn(async () => {});

    const films = await fetchWatchlist({
      fetchImpl,
      sleepImpl,
      username: "cliftonk",
    });

    assert.deepStrictEqual(films, []);
    assert.strictEqual(fetchImpl.mock.calls.length, 1);
  });
});
