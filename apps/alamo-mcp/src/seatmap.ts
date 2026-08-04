import type { CaptureJson } from "./browser.ts";

/**
 * Seat data is read by loading the real seat-selection page for a session and observing
 * the request that page makes for itself. Navigating straight to the deep link is enough —
 * no clicking through the date picker — because the page fetches seats as soon as it has
 * a sessionId/cinemaId in the query string.
 *
 * Deliberately *not* a direct call to `/s/mother/v1/app/seats/...`: see the note in
 * `browser.ts` for why every request here goes through the official interface.
 */
export const SEATMAP_RESPONSE = /\/s\/mother\/v1\/app\/seats\//;

export interface GetSeatmapOptions {
  businessDateClt: string;
  capture: CaptureJson;
  cinemaId: string;
  presentationSlug: string;
  sessionId: string;
}

export interface Seat {
  /** Column position within the row, left to right. Used for center-of-house scoring. */
  columnIndex: number;
  /** e.g. "RECLINER" — absent when upstream sends none. */
  description?: string;
  number: string;
  row: string;
  /** Row position, 0 = closest to the screen. Used for center-of-house scoring. */
  rowIndex: number;
  status: "available" | "unavailable";
  /** "NORMAL" | "HANDICAP" | "COMPANION" as sent by upstream. */
  style?: string;
}

interface RawSeat {
  columnIndex?: unknown;
  rowIndex?: unknown;
  seatDescription?: unknown;
  seatNumber?: unknown;
  seatStatus?: unknown;
  seatStyle?: unknown;
}

export class SeatFeedShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatFeedShapeError";
  }
}

export async function getSeatmap(
  options: GetSeatmapOptions & { market: string },
): Promise<Seat[]> {
  const {
    businessDateClt,
    capture,
    cinemaId,
    market,
    presentationSlug,
    sessionId,
  } = options;
  const raw = await capture({
    match: SEATMAP_RESPONSE,
    url: showUrl({
      businessDateClt,
      cinemaId,
      market,
      presentationSlug,
      sessionId,
    }),
  });
  return parseSeats(raw);
}

/** The seat-selection deep link, built entirely from fields the schedule feed returns. */
export function showUrl(options: {
  businessDateClt: string;
  cinemaId: string;
  market: string;
  presentationSlug: string;
  sessionId: string;
}): string {
  const { businessDateClt, cinemaId, market, presentationSlug, sessionId } =
    options;
  const query = new URLSearchParams({
    cinemaId,
    date: businessDateClt,
    sessionId,
  });
  return (
    `https://drafthouse.com/${encodeURIComponent(market)}` +
    `/show/${encodeURIComponent(presentationSlug)}?${query.toString()}`
  );
}

/**
 * Grid cells that aren't seats (aisles, gaps) come back with a null `seatNumber` and
 * `seatStatus: "NONE"`, so they're skipped rather than treated as malformed. Only a
 * missing `areas`/`rows`/`seats` spine — an actual change in the feed's structure — is an
 * error worth surfacing.
 */
function parseSeats(raw: unknown): Seat[] {
  const seatingData = (raw as null | { data?: { seatingData?: unknown } })?.data
    ?.seatingData;
  const areas = (seatingData as null | { areas?: unknown })?.areas;
  if (!Array.isArray(areas)) {
    throw new SeatFeedShapeError(
      "seat feed shape unexpected: missing data.seatingData.areas",
    );
  }

  return areas.flatMap((area: unknown) => {
    const rows = (area as null | { rows?: unknown })?.rows;
    if (!Array.isArray(rows)) {
      throw new SeatFeedShapeError(
        "seat feed shape unexpected: an area is missing its rows array",
      );
    }
    return rows.flatMap((row: unknown) => {
      const { name, seats } = (row ?? {}) as {
        name?: unknown;
        seats?: unknown;
      };
      if (!Array.isArray(seats)) {
        throw new SeatFeedShapeError(
          "seat feed shape unexpected: a row is missing its seats array",
        );
      }
      // A seat with no row label can't be identified by a caller or booked by a human,
      // and would poison the scoring heuristic with a phantom row — drop the whole row
      // rather than emitting seats labelled "".
      if (typeof name !== "string" || name.trim() === "") return [];
      return seats.flatMap((entry: unknown) => toSeat(entry, name) ?? []);
    });
  });
}

function toSeat(entry: unknown, rowName: string): Seat | undefined {
  const seat = (entry ?? {}) as RawSeat;
  if (
    typeof seat.seatNumber !== "string" ||
    typeof seat.rowIndex !== "number" ||
    typeof seat.columnIndex !== "number"
  ) {
    return undefined;
  }

  const status = toStatus(seat.seatStatus);
  if (status === undefined) return undefined;

  const description =
    typeof seat.seatDescription === "string" ? seat.seatDescription : undefined;
  const style = typeof seat.seatStyle === "string" ? seat.seatStyle : undefined;
  return {
    columnIndex: seat.columnIndex,
    number: seat.seatNumber,
    row: rowName,
    rowIndex: seat.rowIndex,
    status,
    ...(description !== undefined && { description }),
    ...(style !== undefined && { style }),
  };
}

/**
 * `EMPTY` is upstream's "for sale". `SOLD` and `BROKEN` are both simply not bookable.
 * `NONE` marks a non-seat grid cell, and an unrecognized status is treated the same way —
 * dropped rather than guessed at, so a new upstream status can never be sold as available.
 */
function toStatus(raw: unknown): Seat["status"] | undefined {
  switch (raw) {
    case "BROKEN":
    case "SOLD": {
      return "unavailable";
    }
    case "EMPTY": {
      return "available";
    }
    default: {
      return undefined;
    }
  }
}
