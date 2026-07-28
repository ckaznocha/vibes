import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NormalizedSession } from "./normalize.ts";

import { filterSessions } from "./get-sessions.ts";

const sessions: NormalizedSession[] = [
  {
    cinemaId: "9001",
    presentationSlug: "s",
    sessionId: "a",
    showTimeClt: "2026-07-25T19:00:00",
    title: "Sinners",
  },
  {
    cinemaId: "9002",
    presentationSlug: "s",
    sessionId: "c",
    showTimeClt: "2026-07-25T18:00:00",
    title: "Sinners",
  },
];

describe("filterSessions", () => {
  it("returns all sessions when no cinemaId is given", () => {
    assert.deepStrictEqual(filterSessions(sessions), sessions);
  });

  it("filters to the given cinemaId", () => {
    assert.deepStrictEqual(filterSessions(sessions, "9001"), [sessions[0]]);
  });

  it("returns an empty array when no session matches the cinemaId", () => {
    assert.deepStrictEqual(filterSessions(sessions, "0000"), []);
  });
});
