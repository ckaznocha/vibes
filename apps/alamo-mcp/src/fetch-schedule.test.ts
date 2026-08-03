import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { createScheduleFetcher, ScheduleFeedError } from "./fetch-schedule.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

function makeResponse(body: unknown, ok = true, status = 200) {
  return { json: async () => body, ok, status } as Response;
}

describe("createScheduleFetcher", () => {
  it("fetches and normalizes the schedule feed for a market", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-normal.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    const feed = await fetchSchedule("example-market");

    assert.strictEqual(feed.presentations.length, 3);
    assert.strictEqual(feed.sessions.length, 6);
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      "https://drafthouse.com/s/mother/v2/schedule/market/example-market",
    ]);
  });

  it("parses cinema metadata out of data.market", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-normal.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    const feed = await fetchSchedule("example-market");

    assert.strictEqual(feed.cinemas.length, 5);
    const riverbend = feed.cinemas.find((c) => c.id === "9001");
    assert.ok(riverbend);
    assert.strictEqual(riverbend.name, "Riverbend");
    assert.strictEqual(riverbend.slug, "riverbend");
    assert.strictEqual(riverbend.timeZoneName, "America/Chicago");
    assert.strictEqual(typeof riverbend.latitude, "number");
  });

  it("degrades to an empty cinema list rather than throwing when data.market drifts", async () => {
    const normal = fixture("schedule-normal.json") as {
      data: Record<string, unknown>;
    };
    const fetchImpl = mock.fn(async () =>
      makeResponse({ data: { ...normal.data, market: { nope: true } } }),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    const feed = await fetchSchedule("example-market");

    assert.deepStrictEqual(feed.cinemas, []);
    assert.strictEqual(feed.sessions.length, 6);
  });

  it("drops individual cinema entries missing id/name/slug, keeping the rest", async () => {
    const normal = fixture("schedule-normal.json") as {
      data: { market: { cinemas: unknown[] }[] };
    };
    const [firstMarket] = normal.data.market;
    assert.ok(firstMarket);
    const fetchImpl = mock.fn(async () =>
      makeResponse({
        data: {
          ...normal.data,
          market: [
            {
              ...firstMarket,
              cinemas: [{ id: "9999" }, ...firstMarket.cinemas],
            },
          ],
        },
      }),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    const feed = await fetchSchedule("example-market");

    assert.strictEqual(feed.cinemas.length, 5);
    assert.ok(feed.cinemas.every((c) => c.id !== "9999"));
  });

  it("throws ScheduleFeedError when the feed is missing expected keys", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-malformed.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("example-market"), ScheduleFeedError);
  });

  it("throws a plain error on non-2xx response", async () => {
    const fetchImpl = mock.fn(async () => makeResponse({}, false, 503));
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("example-market"), /HTTP 503/);
  });

  it("throws ScheduleFeedError (not a raw SyntaxError) when a 2xx response body is not valid JSON", async () => {
    const fetchImpl = mock.fn(
      async () =>
        ({
          json: async () => {
            throw new SyntaxError("Unexpected token < in JSON at position 0");
          },
          ok: true,
          status: 200,
        }) as unknown as Response,
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("example-market"), ScheduleFeedError);
  });

  it("throws ScheduleFeedError when a session element is missing a required field (e.g. cinemaId)", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-element-malformed.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("example-market"), ScheduleFeedError);
  });

  it("encodes the market slug into the schedule feed URL", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-normal.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await fetchSchedule("new york/city");

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      "https://drafthouse.com/s/mother/v2/schedule/market/new%20york%2Fcity",
    ]);
  });

  it("serves from cache within the TTL without re-fetching", async () => {
    let now = 0;
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-normal.json")),
    );
    const fetchSchedule = createScheduleFetcher({
      fetchImpl,
      nowImpl: () => now,
      ttlSec: 300,
    });

    await fetchSchedule("example-market");
    now += 100_000;
    await fetchSchedule("example-market");

    assert.strictEqual(fetchImpl.mock.calls.length, 1);
  });

  it("re-fetches after the cache TTL expires", async () => {
    let now = 0;
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-normal.json")),
    );
    const fetchSchedule = createScheduleFetcher({
      fetchImpl,
      nowImpl: () => now,
      ttlSec: 300,
    });

    await fetchSchedule("example-market");
    now += 301_000;
    await fetchSchedule("example-market");

    assert.strictEqual(fetchImpl.mock.calls.length, 2);
  });
});
