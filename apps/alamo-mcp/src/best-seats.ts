import { getSeatmap, type GetSeatmapOptions, type Seat } from "./seatmap.ts";

export interface ScoredSeat {
  number: number;
  row: string;
  score: number;
}

export async function bestSeats(
  options: GetSeatmapOptions & { count?: number },
): Promise<ScoredSeat[]> {
  const { count = 1, ...seatmapOptions } = options;
  const seats = await getSeatmap(seatmapOptions);
  return scoreSeats(seats).slice(0, count);
}

export function scoreSeats(
  seats: Seat[],
  options: { centerCol?: number; idealRow?: number } = {},
): ScoredSeat[] {
  const availableSeats = seats.filter((s) => s.status === "available");
  const available = availableSeats.filter(
    (s): s is Seat & { x: number; y: number } =>
      s.x !== undefined && s.y !== undefined,
  );
  if (availableSeats.length > 0 && available.length === 0) {
    throw new Error(
      "seat feed has no x/y coordinates — center-of-house scoring requires them",
    );
  }
  if (available.length === 0) return [];

  const xs = available.map((s) => s.x);
  const ys = available.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerCol = options.centerCol ?? (minX + maxX) / 2;
  const idealRow = options.idealRow ?? minY + (maxY - minY) * 0.65;

  return available
    .map((s) => ({
      number: s.number,
      row: s.row,
      score: Math.abs(s.x - centerCol) + Math.abs(s.y - idealRow),
    }))
    .toSorted((a, b) => a.score - b.score);
}
