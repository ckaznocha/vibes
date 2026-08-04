import { getSeatmap, type GetSeatmapOptions, type Seat } from "./seatmap.ts";

export interface ScoredSeat {
  description?: string;
  number: string;
  row: string;
  score: number;
  style?: string;
}

export async function bestSeats(
  options: GetSeatmapOptions & { count?: number; market: string },
): Promise<ScoredSeat[]> {
  const { count = 1, ...seatmapOptions } = options;
  const seats = await getSeatmap(seatmapOptions);
  return scoreSeats(seats).slice(0, count);
}

/**
 * Lower score is better. The ideal seat sits horizontally centered and about two-thirds
 * of the way back from the screen, which is the usual center-of-house rule of thumb; both
 * targets are derived from the actual occupied grid rather than assumed, so an odd screen
 * layout still scores sensibly.
 */
export function scoreSeats(
  seats: Seat[],
  options: { centerCol?: number; idealRow?: number } = {},
): ScoredSeat[] {
  const available = seats.filter((s) => s.status === "available");
  if (available.length === 0) return [];

  const columns = available.map((s) => s.columnIndex);
  const rows = available.map((s) => s.rowIndex);
  const minColumn = Math.min(...columns);
  const maxColumn = Math.max(...columns);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);

  const centerCol = options.centerCol ?? (minColumn + maxColumn) / 2;
  const idealRow = options.idealRow ?? minRow + (maxRow - minRow) * 0.65;

  return available
    .map((s) => ({
      number: s.number,
      row: s.row,
      score:
        Math.abs(s.columnIndex - centerCol) + Math.abs(s.rowIndex - idealRow),
      ...(s.description !== undefined && { description: s.description }),
      ...(s.style !== undefined && { style: s.style }),
    }))
    .toSorted((a, b) => a.score - b.score);
}
