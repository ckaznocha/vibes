import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import {
  getSeatmap,
  SeatFeedShapeError,
  SEATMAP_RESPONSE,
  showUrl,
} from "./seatmap.ts";

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

describe("showUrl", () => {
  it("builds the seat-selection deep link from schedule-feed fields", () => {
    assert.strictEqual(
      showUrl(session),
      "https://drafthouse.com/example-market/show/chrome-meridian" +
        "?cinemaId=9003&date=2026-08-19&sessionId=700003",
    );
  });

  it("encodes market and presentationSlug path segments", () => {
    assert.strictEqual(
      showUrl({ ...session, market: "a/b", presentationSlug: "c d" }),
      "https://drafthouse.com/a%2Fb/show/c%20d" +
        "?cinemaId=9003&date=2026-08-19&sessionId=700003",
    );
  });
});

describe("getSeatmap", () => {
  it("parses seats out of a real seat-map payload", async () => {
    const capture = captureOf(fixture("seatmap-normal.json"));

    const seats = await getSeatmap({
      ...session,
      capture,
    });

    // 51 grid cells in the fixture, 8 of which are non-seat spacers.
    assert.strictEqual(seats.length, 43);
    assert.strictEqual(
      seats.filter((s) => s.status === "available").length,
      26,
    );
    assert.strictEqual(
      seats.filter((s) => s.status === "unavailable").length,
      17,
    );
  });

  it("carries row name, grid indices, and seat style through", async () => {
    const capture = captureOf(fixture("seatmap-normal.json"));

    const seats = await getSeatmap({
      ...session,
      capture,
    });

    const seat = seats.find((s) => s.row === "1" && s.number === "15");
    assert.ok(seat);
    assert.strictEqual(seat.rowIndex, 0);
    assert.strictEqual(seat.columnIndex, 1);
    assert.strictEqual(seat.style, "NORMAL");
    assert.strictEqual(seat.description, "RECLINER");
  });

  it("treats SOLD and BROKEN alike as unavailable", async () => {
    const capture = captureOf({
      data: {
        seatingData: {
          areas: [
            {
              rows: [
                {
                  name: "1",
                  seats: [
                    {
                      columnIndex: 0,
                      rowIndex: 0,
                      seatNumber: "1",
                      seatStatus: "SOLD",
                    },
                    {
                      columnIndex: 1,
                      rowIndex: 0,
                      seatNumber: "2",
                      seatStatus: "BROKEN",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    const seats = await getSeatmap({
      ...session,
      capture,
    });

    assert.deepStrictEqual(
      seats.map((s) => s.status),
      ["unavailable", "unavailable"],
    );
  });

  it("drops an unrecognized seatStatus rather than reporting it available", async () => {
    const capture = captureOf({
      data: {
        seatingData: {
          areas: [
            {
              rows: [
                {
                  name: "1",
                  seats: [
                    {
                      columnIndex: 0,
                      rowIndex: 0,
                      seatNumber: "1",
                      seatStatus: "SOME_NEW_STATUS",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    const seats = await getSeatmap({
      ...session,
      capture,
    });

    assert.deepStrictEqual(seats, []);
  });

  it('skips a row with no usable name rather than emitting seats labelled ""', async () => {
    const capture = captureOf({
      data: {
        seatingData: {
          areas: [
            {
              rows: [
                {
                  seats: [
                    {
                      columnIndex: 0,
                      rowIndex: 0,
                      seatNumber: "1",
                      seatStatus: "EMPTY",
                    },
                  ],
                },
                {
                  name: " ".repeat(3),
                  seats: [
                    {
                      columnIndex: 0,
                      rowIndex: 1,
                      seatNumber: "1",
                      seatStatus: "EMPTY",
                    },
                  ],
                },
                {
                  name: "3",
                  seats: [
                    {
                      columnIndex: 0,
                      rowIndex: 2,
                      seatNumber: "1",
                      seatStatus: "EMPTY",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    const seats = await getSeatmap({
      ...session,
      capture,
    });

    assert.deepStrictEqual(
      seats.map((s) => s.row),
      ["3"],
    );
  });

  it("navigates to the seat-selection deep link and matches the seats response", async () => {
    const capture = captureOf(fixture("seatmap-normal.json"));

    await getSeatmap({ ...session, capture });

    const [call] = capture.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      { match: SEATMAP_RESPONSE, url: showUrl(session) },
    ]);
  });

  it("throws SeatFeedShapeError when the seatingData.areas spine is missing", async () => {
    const capture = captureOf(fixture("seatmap-malformed.json"));

    await assert.rejects(
      getSeatmap({ ...session, capture }),
      SeatFeedShapeError,
    );
  });

  it("throws SeatFeedShapeError when a row is missing its seats array", async () => {
    const capture = captureOf({
      data: { seatingData: { areas: [{ rows: [{ name: "1" }] }] } },
    });

    await assert.rejects(
      getSeatmap({ ...session, capture }),
      SeatFeedShapeError,
    );
  });
});
