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

    const feed = await fetchSchedule("los-angeles");

    assert.strictEqual(feed.presentations.length, 2);
    assert.strictEqual(feed.sessions.length, 3);
    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      "https://drafthouse.com/s/mother/v2/schedule/market/los-angeles",
    ]);
  });

  it("throws ScheduleFeedError when the feed is missing expected keys", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-malformed.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("los-angeles"), ScheduleFeedError);
  });

  it("throws a plain error on non-2xx response", async () => {
    const fetchImpl = mock.fn(async () => makeResponse({}, false, 503));
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("los-angeles"), /HTTP 503/);
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

    await assert.rejects(fetchSchedule("los-angeles"), ScheduleFeedError);
  });

  it("throws ScheduleFeedError when a session element is missing a required field (e.g. cinemaId)", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("schedule-element-malformed.json")),
    );
    const fetchSchedule = createScheduleFetcher({ fetchImpl });

    await assert.rejects(fetchSchedule("los-angeles"), ScheduleFeedError);
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

    await fetchSchedule("los-angeles");
    now += 100_000;
    await fetchSchedule("los-angeles");

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

    await fetchSchedule("los-angeles");
    now += 301_000;
    await fetchSchedule("los-angeles");

    assert.strictEqual(fetchImpl.mock.calls.length, 2);
  });
});
