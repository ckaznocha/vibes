import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ScheduleFeed } from "./fetch-schedule.ts";

import { normalizeSessions } from "./normalize.ts";

const feed: ScheduleFeed = {
  presentations: [{ show: { title: "Sinners" }, slug: "sinners-2025-dtla" }],
  sessions: [
    {
      cinemaId: "9001",
      presentationSlug: "sinners-2025-dtla",
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
        presentationSlug: "sinners-2025-dtla",
        sessionId: "9001|2026-07-25T19:00:00|sinners-2025-dtla",
        showTimeClt: "2026-07-25T19:00:00",
        title: "Sinners",
      },
    ]);
  });

  it("falls back to the presentationSlug as title when no matching presentation exists", () => {
    const orphanFeed: ScheduleFeed = {
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
      presentations: [
        { show: { title: "Sinners" }, slug: "sinners-2025-dtla" },
      ],
      sessions: [
        {
          cinemaId: "9001",
          presentationSlug: "sinners-2025-dtla",
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
      presentations: [
        { show: { title: "Sinners" }, slug: "sinners-2025-dtla" },
      ],
      sessions: [
        {
          cinemaId: "9001",
          id: "native-id-456",
          presentationSlug: "sinners-2025-dtla",
          showTimeClt: "2026-07-25T19:00:00",
        },
      ],
    };
    const result = normalizeSessions(feedWithId);
    assert.strictEqual(result[0]?.sessionId, "native-id-456");
  });
});
