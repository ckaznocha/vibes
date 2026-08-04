import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createScheduleFetcher,
  marketUrl,
  SCHEDULE_RESPONSE,
  ScheduleFeedError,
} from "./fetch-schedule.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

/** Stands in for the browser: returns whatever the page would have fetched. */
const captureOf = (body: unknown) => mock.fn(async () => body);

describe("createScheduleFetcher", () => {
  it("fetches and normalizes the schedule feed for a market", async () => {
    const capture = captureOf(fixture("schedule-normal.json"));
    const fetchSchedule = createScheduleFetcher({ capture });

    const feed = await fetchSchedule("example-market");

    assert.strictEqual(feed.presentations.length, 3);
    assert.strictEqual(feed.sessions.length, 6);
    const [call] = capture.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      { match: SCHEDULE_RESPONSE, url: marketUrl("example-market") },
    ]);
  });

  it("parses cinema metadata out of data.market", async () => {
    const capture = captureOf(fixture("schedule-normal.json"));
    const fetchSchedule = createScheduleFetcher({ capture });

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
    const capture = captureOf({
      data: { ...normal.data, market: { nope: true } },
    });
    const fetchSchedule = createScheduleFetcher({ capture });

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
    const capture = captureOf({
      data: {
        ...normal.data,
        market: [
          {
            ...firstMarket,
            cinemas: [{ id: "9999" }, ...firstMarket.cinemas],
          },
        ],
      },
    });
    const fetchSchedule = createScheduleFetcher({ capture });

    const feed = await fetchSchedule("example-market");

    assert.strictEqual(feed.cinemas.length, 5);
    assert.ok(feed.cinemas.every((c) => c.id !== "9999"));
  });

  it("throws ScheduleFeedError when the feed is missing expected keys", async () => {
    const capture = captureOf(fixture("schedule-malformed.json"));
    const fetchSchedule = createScheduleFetcher({ capture });

    await assert.rejects(fetchSchedule("example-market"), ScheduleFeedError);
  });

  it("throws ScheduleFeedError when a session element is missing a required field (e.g. cinemaId)", async () => {
    const capture = captureOf(fixture("schedule-element-malformed.json"));
    const fetchSchedule = createScheduleFetcher({ capture });

    await assert.rejects(fetchSchedule("example-market"), ScheduleFeedError);
  });

  it("navigates to the market landing page, encoding the slug", async () => {
    const capture = captureOf(fixture("schedule-normal.json"));
    const fetchSchedule = createScheduleFetcher({ capture });

    await fetchSchedule("new york/city");

    const [call] = capture.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      { match: SCHEDULE_RESPONSE, url: marketUrl("new york/city") },
    ]);
  });

  it("serves from cache within the TTL without re-fetching", async () => {
    let now = 0;
    const capture = captureOf(fixture("schedule-normal.json"));
    const fetchSchedule = createScheduleFetcher({
      capture,
      nowImpl: () => now,
      ttlSec: 300,
    });

    await fetchSchedule("example-market");
    now += 100_000;
    await fetchSchedule("example-market");

    assert.strictEqual(capture.mock.calls.length, 1);
  });

  it("re-fetches after the cache TTL expires", async () => {
    let now = 0;
    const capture = captureOf(fixture("schedule-normal.json"));
    const fetchSchedule = createScheduleFetcher({
      capture,
      nowImpl: () => now,
      ttlSec: 300,
    });

    await fetchSchedule("example-market");
    now += 301_000;
    await fetchSchedule("example-market");

    assert.strictEqual(capture.mock.calls.length, 2);
  });
});
