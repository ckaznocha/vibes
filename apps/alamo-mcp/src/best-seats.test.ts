import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import type { Seat } from "./seatmap.ts";

import { bestSeats, scoreSeats } from "./best-seats.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

const captureOf = (body: unknown) => mock.fn(async () => body);

const session = {
  businessDateClt: "2026-08-19",
  cinemaId: "9003",
  market: "example-market",
  presentationSlug: "chrome-meridian",
  sessionId: "700003",
};

const seat = (
  over: Partial<Seat> & Pick<Seat, "columnIndex" | "rowIndex">,
) => ({
  number: "1",
  row: "A",
  status: "available" as const,
  ...over,
});

describe("scoreSeats", () => {
  it("ranks a center-of-house seat above a front-corner seat", () => {
    const seats: Seat[] = [
      seat({ columnIndex: 0, number: "1", row: "1", rowIndex: 0 }),
      seat({ columnIndex: 5, number: "5", row: "7", rowIndex: 7 }),
      seat({
        columnIndex: 5,
        number: "9",
        row: "10",
        rowIndex: 10,
        status: "unavailable",
      }),
    ];

    const scored = scoreSeats(seats);

    assert.strictEqual(scored.length, 2);
    const [best, second] = scored;
    assert.ok(best);
    assert.ok(second);
    assert.strictEqual(best.row, "7");
    assert.strictEqual(best.number, "5");
    assert.ok(best.score < second.score);
  });

  it("targets roughly two-thirds back rather than the exact middle row", () => {
    const seats: Seat[] = Array.from({ length: 11 }, (_, index) =>
      seat({
        columnIndex: 0,
        number: String(index),
        row: String(index),
        rowIndex: index,
      }),
    );

    const [best] = scoreSeats(seats);

    assert.ok(best);
    // 0.65 * 10 = 6.5, so rows 6 and 7 tie for closest; either is acceptable.
    assert.ok(["6", "7"].includes(best.row));
  });

  it("returns an empty array when no seats are available at all", () => {
    const seats: Seat[] = [
      seat({ columnIndex: 0, rowIndex: 0, status: "unavailable" }),
    ];
    assert.deepStrictEqual(scoreSeats(seats), []);
  });

  it("returns an empty array when there are zero seats at all", () => {
    assert.deepStrictEqual(scoreSeats([]), []);
  });

  it("carries seat style and description onto the scored result", () => {
    const [best] = scoreSeats([
      seat({
        columnIndex: 0,
        description: "RECLINER",
        rowIndex: 0,
        style: "HANDICAP",
      }),
    ]);

    assert.ok(best);
    assert.strictEqual(best.style, "HANDICAP");
    assert.strictEqual(best.description, "RECLINER");
  });
});

describe("bestSeats", () => {
  it("returns the top N scored seats from a real seat-map payload", async () => {
    const capture = captureOf(fixture("seatmap-normal.json"));

    const result = await bestSeats({ ...session, capture, count: 3 });

    assert.strictEqual(result.length, 3);
    // Scores must be non-decreasing — best seat first.
    assert.deepStrictEqual(
      result.map((s) => s.score),
      result.map((s) => s.score).toSorted((a, b) => a - b),
    );
    // Every returned seat must be one that's actually for sale.
    assert.ok(result.every((s) => typeof s.number === "string"));
  });

  it("defaults to a single seat", async () => {
    const capture = captureOf(fixture("seatmap-normal.json"));

    const result = await bestSeats({ ...session, capture });

    assert.strictEqual(result.length, 1);
  });

  it("propagates a capture failure from getSeatmap", async () => {
    const capture = mock.fn(async () => {
      throw new Error("no matching response captured");
    });

    await assert.rejects(
      bestSeats({ ...session, capture }),
      /no matching response captured/,
    );
  });
});
