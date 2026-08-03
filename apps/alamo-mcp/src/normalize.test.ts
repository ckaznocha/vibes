import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ScheduleFeed } from "./fetch-schedule.ts";

import { normalizeSessions } from "./normalize.ts";

const feed: ScheduleFeed = {
  cinemas: [],
  presentations: [
    { show: { title: "Chrome Meridian" }, slug: "chrome-meridian" },
  ],
  sessions: [
    {
      cinemaId: "9001",
      presentationSlug: "chrome-meridian",
      showTimeClt: "2026-07-25T19:00:00",
    },
  ],
};

describe("normalizeSessions", () => {
  it("joins session to presentation title and derives a composite sessionId", () => {
    const result = normalizeSessions(feed);
    assert.deepStrictEqual(result, [
      {
        cinemaId: "9001",
        presentationSlug: "chrome-meridian",
        sessionId: "9001|2026-07-25T19:00:00|chrome-meridian",
        showTimeClt: "2026-07-25T19:00:00",
        title: "Chrome Meridian",
      },
    ]);
  });

  it("falls back to the presentationSlug as title when no matching presentation exists", () => {
    const orphanFeed: ScheduleFeed = {
      cinemas: [],
      presentations: [],
      sessions: [
        {
          cinemaId: "9001",
          presentationSlug: "unknown-slug",
          showTimeClt: "2026-07-25T19:00:00",
        },
      ],
    };
    const result = normalizeSessions(orphanFeed);
    assert.strictEqual(result[0]?.title, "unknown-slug");
  });

  it("prefers a native sessionId field over the composite key when present", () => {
    const feedWithNativeId: ScheduleFeed = {
      cinemas: [],
      presentations: [
        { show: { title: "Chrome Meridian" }, slug: "chrome-meridian" },
      ],
      sessions: [
        {
          cinemaId: "9001",
          presentationSlug: "chrome-meridian",
          sessionId: "native-session-id-123",
          showTimeClt: "2026-07-25T19:00:00",
        },
      ],
    };
    const result = normalizeSessions(feedWithNativeId);
    assert.strictEqual(result[0]?.sessionId, "native-session-id-123");
  });

  it("prefers a native id field over the composite key when sessionId is absent", () => {
    const feedWithId: ScheduleFeed = {
      cinemas: [],
      presentations: [
        { show: { title: "Chrome Meridian" }, slug: "chrome-meridian" },
      ],
      sessions: [
        {
          cinemaId: "9001",
          id: "native-id-456",
          presentationSlug: "chrome-meridian",
          showTimeClt: "2026-07-25T19:00:00",
        },
      ],
    };
    const result = normalizeSessions(feedWithId);
    assert.strictEqual(result[0]?.sessionId, "native-id-456");
  });
});
