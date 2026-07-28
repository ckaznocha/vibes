import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import type { Seat } from "./seatmap.ts";

import { bestSeats, scoreSeats } from "./best-seats.ts";
import { SeatUrlNotConfiguredError } from "./seatmap.ts";

describe("scoreSeats", () => {
  it("ranks a dead-center seat above an edge/front seat", () => {
    const seats: Seat[] = [
      { number: 1, row: "A", status: "available", x: 0, y: 0 }, // front-left corner
      { number: 5, row: "F", status: "available", x: 5, y: 10 }, // near center of a 0-10 x, 0-15 y grid
      { number: 5, row: "J", status: "unavailable", x: 5, y: 15 }, // taken, must be excluded
    ];

    const scored = scoreSeats(seats);

    assert.strictEqual(scored.length, 2);
    const [best, second] = scored;
    assert.ok(best);
    assert.ok(second);
    assert.strictEqual(best.row, "F");
    assert.strictEqual(best.number, 5);
    assert.strictEqual(typeof best.score, "number");
    assert.ok(best.score < second.score);
  });

  it("throws when available seats exist but none have x/y coordinates", () => {
    const seats: Seat[] = [{ number: 1, row: "A", status: "available" }];
    assert.throws(() => scoreSeats(seats), /x\/y coordinates/);
  });

  it("returns an empty array when no seats are available at all", () => {
    const seats: Seat[] = [
      { number: 1, row: "A", status: "unavailable", x: 0, y: 0 },
    ];
    assert.deepStrictEqual(scoreSeats(seats), []);
  });

  it("returns an empty array when there are zero seats at all", () => {
    assert.deepStrictEqual(scoreSeats([]), []);
  });
});

describe("bestSeats", () => {
  it("returns the top N scored seats from getSeatmap", async () => {
    const fetchImpl = mock.fn(async () => ({
      json: async () => ({
        seats: [
          { number: 1, row: "A", status: "available", x: 0, y: 0 },
          { number: 5, row: "F", status: "available", x: 5, y: 10 },
          { number: 6, row: "F", status: "available", x: 6, y: 10 },
        ],
      }),
      ok: true,
    }));

    const result = await bestSeats({
      count: 2,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      seatUrlTemplate: "https://x/{sessionId}",
      sessionId: "abc",
    });

    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(
      result.map((s) => `${s.row}${String(s.number)}`),
      ["F5", "F6"],
    );
  });

  it("propagates a not-configured error from getSeatmap", async () => {
    await assert.rejects(
      bestSeats({ sessionId: "abc" }),
      SeatUrlNotConfiguredError,
    );
  });
});
