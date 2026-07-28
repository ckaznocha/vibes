import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NormalizedSession } from "./normalize.ts";

import { listCinemas } from "./list-cinemas.ts";

const sessions: NormalizedSession[] = [
  {
    cinemaId: "9001",
    presentationSlug: "s",
    sessionId: "a",
    showTimeClt: "2026-07-25T19:00:00",
    title: "Sinners",
  },
  {
    cinemaId: "9001",
    presentationSlug: "t",
    sessionId: "b",
    showTimeClt: "2026-07-26T21:30:00",
    title: "The Thing",
  },
  {
    cinemaId: "9002",
    presentationSlug: "s",
    sessionId: "c",
    showTimeClt: "2026-07-25T18:00:00",
    title: "Sinners",
  },
];

describe("listCinemas", () => {
  it("groups sessions by cinemaId with up to 3 samples each", () => {
    const result = listCinemas(sessions);
    assert.deepStrictEqual(result, [
      {
        cinemaId: "9001",
        sampleSessions: [
          { showTimeClt: "2026-07-25T19:00:00", title: "Sinners" },
          { showTimeClt: "2026-07-26T21:30:00", title: "The Thing" },
        ],
      },
      {
        cinemaId: "9002",
        sampleSessions: [
          { showTimeClt: "2026-07-25T18:00:00", title: "Sinners" },
        ],
      },
    ]);
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
