import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { buildSeatUrl, getSeatmap, SeatFeedShapeError } from "./seatmap.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

function makeResponse(body: unknown, ok = true, status = 200) {
  return { json: async () => body, ok, status } as Response;
}

describe("buildSeatUrl", () => {
  it("substitutes cinemaId and sessionId into the default endpoint", () => {
    assert.strictEqual(
      buildSeatUrl({ cinemaId: "9003", sessionId: "700003" }),
      "https://drafthouse.com/s/mother/v1/app/seats/9003/700003",
    );
  });

  it("encodes both path params", () => {
    assert.strictEqual(
      buildSeatUrl({ cinemaId: "a/b", sessionId: "c d" }),
      "https://drafthouse.com/s/mother/v1/app/seats/a%2Fb/c%20d",
    );
  });

  it("honors an override template", () => {
    assert.strictEqual(
      buildSeatUrl({
        cinemaId: "9003",
        seatUrlTemplate: "https://example.test/{cinemaId}/x/{sessionId}",
        sessionId: "700003",
      }),
      "https://example.test/9003/x/700003",
    );
  });
});

describe("getSeatmap", () => {
  it("parses seats out of a real seat-map payload", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("seatmap-normal.json")),
    );

    const seats = await getSeatmap({
      cinemaId: "9003",
      fetchImpl,
      sessionId: "700003",
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
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("seatmap-normal.json")),
    );

    const seats = await getSeatmap({
      cinemaId: "9003",
      fetchImpl,
      sessionId: "700003",
    });

    const seat = seats.find((s) => s.row === "1" && s.number === "15");
    assert.ok(seat);
    assert.strictEqual(seat.rowIndex, 0);
    assert.strictEqual(seat.columnIndex, 1);
    assert.strictEqual(seat.style, "NORMAL");
    assert.strictEqual(seat.description, "RECLINER");
  });

  it("treats SOLD and BROKEN alike as unavailable", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({
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
      }),
    );

    const seats = await getSeatmap({
      cinemaId: "9003",
      fetchImpl,
      sessionId: "1",
    });

    assert.deepStrictEqual(
      seats.map((s) => s.status),
      ["unavailable", "unavailable"],
    );
  });

  it("drops an unrecognized seatStatus rather than reporting it available", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({
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
      }),
    );

    const seats = await getSeatmap({
      cinemaId: "9003",
      fetchImpl,
      sessionId: "1",
    });

    assert.deepStrictEqual(seats, []);
  });

  it('skips a row with no usable name rather than emitting seats labelled ""', async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({
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
      }),
    );

    const seats = await getSeatmap({
      cinemaId: "9003",
      fetchImpl,
      sessionId: "1",
    });

    assert.deepStrictEqual(
      seats.map((s) => s.row),
      ["3"],
    );
  });

  it("requests the URL built from cinemaId and sessionId", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("seatmap-normal.json")),
    );

    await getSeatmap({ cinemaId: "9003", fetchImpl, sessionId: "700003" });

    const [call] = fetchImpl.mock.calls;
    assert.ok(call);
    assert.deepStrictEqual(call.arguments, [
      "https://drafthouse.com/s/mother/v1/app/seats/9003/700003",
    ]);
  });

  it("throws SeatFeedShapeError when the seatingData.areas spine is missing", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse(fixture("seatmap-malformed.json")),
    );

    await assert.rejects(
      getSeatmap({ cinemaId: "9003", fetchImpl, sessionId: "700003" }),
      SeatFeedShapeError,
    );
  });

  it("throws SeatFeedShapeError when a row is missing its seats array", async () => {
    const fetchImpl = mock.fn(async () =>
      makeResponse({
        data: { seatingData: { areas: [{ rows: [{ name: "1" }] }] } },
      }),
    );

    await assert.rejects(
      getSeatmap({ cinemaId: "9003", fetchImpl, sessionId: "1" }),
      SeatFeedShapeError,
    );
  });

  it("throws a plain error on non-2xx response", async () => {
    const fetchImpl = mock.fn(async () => makeResponse({}, false, 503));

    await assert.rejects(
      getSeatmap({ cinemaId: "9003", fetchImpl, sessionId: "1" }),
      /HTTP 503/,
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
      getSeatmap({ cinemaId: "9003", fetchImpl, sessionId: "1" }),
      SeatFeedShapeError,
    );
  });
});
