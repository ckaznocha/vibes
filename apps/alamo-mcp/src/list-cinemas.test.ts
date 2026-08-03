import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Cinema } from "./fetch-schedule.ts";
import type { NormalizedSession } from "./normalize.ts";

import { listCinemas } from "./list-cinemas.ts";

const cinemas: Cinema[] = [
  {
    city: "Austin",
    id: "9001",
    latitude: 30.45,
    longitude: -97.8,
    name: "Riverbend",
    slug: "riverbend",
    state: "TX",
    street1: "14028 U.S. 183",
    timeZoneName: "America/Chicago",
  },
  { id: "9003", name: "Village", slug: "village" },
];

const sessions: NormalizedSession[] = [
  {
    cinemaId: "9001",
    presentationSlug: "s",
    sessionId: "a",
    showTimeClt: "2026-07-25T19:00:00",
    title: "Chrome Meridian",
  },
  {
    cinemaId: "9001",
    presentationSlug: "t",
    sessionId: "b",
    showTimeClt: "2026-07-26T21:30:00",
    title: "Nightjar Boulevard",
  },
  {
    cinemaId: "9002",
    presentationSlug: "s",
    sessionId: "c",
    showTimeClt: "2026-07-25T18:00:00",
    title: "Chrome Meridian",
  },
];

describe("listCinemas", () => {
  it("groups sessions by cinemaId with up to 3 samples each when no metadata is available", () => {
    const result = listCinemas(sessions);
    assert.deepStrictEqual(result, [
      {
        cinemaId: "9001",
        sampleSessions: [
          { showTimeClt: "2026-07-25T19:00:00", title: "Chrome Meridian" },
          { showTimeClt: "2026-07-26T21:30:00", title: "Nightjar Boulevard" },
        ],
        sessionCount: 2,
      },
      {
        cinemaId: "9002",
        sampleSessions: [
          { showTimeClt: "2026-07-25T18:00:00", title: "Chrome Meridian" },
        ],
        sessionCount: 1,
      },
    ]);
  });

  it("merges cinema metadata onto the matching cinemaId", () => {
    const [riverbend] = listCinemas(sessions, cinemas);
    assert.deepStrictEqual(riverbend, {
      address: "14028 U.S. 183, Austin, TX",
      cinemaId: "9001",
      latitude: 30.45,
      longitude: -97.8,
      name: "Riverbend",
      sampleSessions: [
        { showTimeClt: "2026-07-25T19:00:00", title: "Chrome Meridian" },
        { showTimeClt: "2026-07-26T21:30:00", title: "Nightjar Boulevard" },
      ],
      sessionCount: 2,
      slug: "riverbend",
      timeZoneName: "America/Chicago",
    });
  });

  it("includes a known cinema that has no sessions, with sessionCount 0", () => {
    const village = listCinemas(sessions, cinemas).find(
      (c) => c.cinemaId === "9003",
    );
    assert.deepStrictEqual(village, {
      cinemaId: "9003",
      name: "Village",
      sampleSessions: [],
      sessionCount: 0,
      slug: "village",
    });
  });

  it("appends a cinemaId seen only on sessions rather than dropping it", () => {
    const result = listCinemas(sessions, cinemas);
    assert.deepStrictEqual(
      result.map((c) => c.cinemaId),
      ["9001", "9003", "9002"],
    );
    const orphan = result.at(-1);
    assert.strictEqual(orphan?.name, undefined);
    assert.strictEqual(orphan?.sessionCount, 1);
  });

  it("omits address entirely when a cinema carries no street/city fields", () => {
    const [only] = listCinemas([], [{ id: "9003", name: "V", slug: "v" }]);
    assert.ok(only);
    assert.ok(!("address" in only));
  });

  it("caps samples at 3 per cinema", () => {
    const many: NormalizedSession[] = Array.from({ length: 5 }, (_, index) => ({
      cinemaId: "9001",
      presentationSlug: `slug-${String(index)}`,
      sessionId: `s${String(index)}`,
      showTimeClt: `2026-07-25T1${String(index)}:00:00`,
      title: `Film ${String(index)}`,
    }));
    const result = listCinemas(many);
    assert.strictEqual(result[0]?.sampleSessions.length, 3);
  });
});
