import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import {
  getSeatmap,
  SeatFeedShapeError,
  SeatUrlNotConfiguredError,
} from "./seatmap.ts";

function makeResponse(body: unknown, ok = true, status = 200) {
  return { json: async () => body, ok, status } as Response;
}

describe("getSeatmap", () => {
  it("throws SeatUrlNotConfiguredError when no template is set", async () => {
    await assert.rejects(
      getSeatmap({ sessionId: "abc" }),
      SeatUrlNotConfiguredError,
    );
  });

  it("fetches using the sessionId substituted into the template", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({
        seats: [{ number: 1, row: "A", status: "available", x: 5, y: 10 }],
      }),
    );

    const seats = await getSeatmap({
      fetchImpl,
      seatUrlTemplate: "https://drafthouse.com/seats/{sessionId}",
      sessionId: "abc123",
    });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      "https://drafthouse.com/seats/abc123",
    ]);
    assert.deepStrictEqual(seats, [
      { number: 1, row: "A", status: "available", x: 5, y: 10 },
    ]);
  });

  it("throws SeatFeedShapeError when the response has no seats array", async () => {
    const fetchImpl = mock.fn(async () => makeResponse({ notSeats: [] }));

    await assert.rejects(
      getSeatmap({
        fetchImpl,
        seatUrlTemplate: "https://x/{sessionId}",
        sessionId: "abc",
      }),
      SeatFeedShapeError,
    );
  });

  it("throws SeatFeedShapeError when a seat entry is missing required fields", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({ seats: [{ row: "A" }] }),
    );

    await assert.rejects(
      getSeatmap({
        fetchImpl,
        seatUrlTemplate: "https://x/{sessionId}",
        sessionId: "abc",
      }),
      SeatFeedShapeError,
    );
  });

  it("throws a plain error on non-2xx response", async () => {
    const fetchImpl = mock.fn(async () => makeResponse({}, false, 500));

    await assert.rejects(
      getSeatmap({
        fetchImpl,
        seatUrlTemplate: "https://x/{sessionId}",
        sessionId: "abc",
      }),
      /HTTP 500/,
    );
  });

  it("throws SeatFeedShapeError (not a raw SyntaxError) when a 2xx response body is not valid JSON", async () => {
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

    await assert.rejects(
      getSeatmap({
        fetchImpl,
        seatUrlTemplate: "https://x/{sessionId}",
        sessionId: "abc",
      }),
      SeatFeedShapeError,
    );
  });
});
