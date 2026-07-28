export interface GetSeatmapOptions {
  fetchImpl?: typeof fetch;
  seatUrlTemplate?: string;
  sessionId: string;
}

export interface Seat {
  number: number;
  row: string;
  status: "available" | "unavailable";
  x?: number;
  y?: number;
}

interface RawSeat {
  number?: unknown;
  row?: unknown;
  status?: unknown;
  x?: unknown;
  y?: unknown;
}

export class SeatFeedShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeatFeedShapeError";
  }
}

export class SeatUrlNotConfiguredError extends Error {
  constructor() {
    super(
      "ALAMO_SEAT_URL_TEMPLATE not configured — seat endpoint must be reverse-engineered from a live browser " +
        "Network tab per the source report; this tool is a stub until then.",
    );
    this.name = "SeatUrlNotConfiguredError";
  }
}

export async function getSeatmap(options: GetSeatmapOptions): Promise<Seat[]> {
  const { fetchImpl = fetch, seatUrlTemplate, sessionId } = options;
  if (!seatUrlTemplate) {
    throw new SeatUrlNotConfiguredError();
  }

  const url = seatUrlTemplate.replace("{sessionId}", () =>
    encodeURIComponent(sessionId),
  );
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

function parseSeats(raw: unknown): Seat[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as { seats?: unknown }).seats)
  ) {
    throw new SeatFeedShapeError(
      "seat feed shape unexpected: missing seats array",
    );
  }
  return (raw as { seats: unknown[] }).seats.map((entry) => {
    const seat = entry as RawSeat;
    if (
      typeof seat.row !== "string" ||
      typeof seat.number !== "number" ||
      (seat.status !== "available" && seat.status !== "unavailable")
    ) {
      throw new SeatFeedShapeError(
        "seat feed shape unexpected: malformed seat entry",
      );
    }
    const x = typeof seat.x === "number" ? seat.x : undefined;
    const y = typeof seat.y === "number" ? seat.y : undefined;
    return {
      number: seat.number,
      row: seat.row,
      status: seat.status,
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
    };
  });
}
