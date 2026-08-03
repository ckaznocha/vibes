/**
 * Seat map endpoint, confirmed against a live drafthouse.com seat-selection page:
 * `GET /s/mother/v1/app/seats/{cinemaId}/{sessionId}`. The site also sends a
 * `userSessionId` query param, but the endpoint returns the same payload without it — no
 * auth, cookie, or session priming is required. Both path params come straight off a
 * schedule-feed session (`cinemaId`, `sessionId`).
 */
export const DEFAULT_SEAT_URL_TEMPLATE =
  "https://drafthouse.com/s/mother/v1/app/seats/{cinemaId}/{sessionId}";

export interface GetSeatmapOptions {
  cinemaId: string;
  fetchImpl?: typeof fetch;
  seatUrlTemplate?: string;
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

export function buildSeatUrl(options: {
  cinemaId: string;
  seatUrlTemplate?: string;
  sessionId: string;
}): string {
  const {
    cinemaId,
    seatUrlTemplate = DEFAULT_SEAT_URL_TEMPLATE,
    sessionId,
  } = options;
  return seatUrlTemplate
    .replace("{cinemaId}", () => encodeURIComponent(cinemaId))
    .replace("{sessionId}", () => encodeURIComponent(sessionId));
}

export async function getSeatmap(options: GetSeatmapOptions): Promise<Seat[]> {
  const { cinemaId, fetchImpl = fetch, seatUrlTemplate, sessionId } = options;
  const url = buildSeatUrl({
    cinemaId,
    sessionId,
    ...(seatUrlTemplate !== undefined && { seatUrlTemplate }),
  });

  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `alamo seatmap fetch failed: HTTP ${String(response.status)} for ${url}`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new SeatFeedShapeError(
      `alamo seatmap fetch returned a non-JSON response body for ${url}`,
    );
  }
  return parseSeats(raw);
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
