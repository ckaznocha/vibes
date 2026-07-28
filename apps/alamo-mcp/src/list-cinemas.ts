import type { NormalizedSession } from "./normalize.ts";

export interface CinemaSample {
  cinemaId: string;
  sampleSessions: { showTimeClt: string; title: string }[];
}

export function listCinemas(sessions: NormalizedSession[]): CinemaSample[] {
  const byCinema = new Map<string, NormalizedSession[]>();
  for (const s of sessions) {
    const array = byCinema.get(s.cinemaId) ?? [];
    array.push(s);
    byCinema.set(s.cinemaId, array);
  }
  return [...byCinema].map(([cinemaId, sess]) => ({
    cinemaId,
    sampleSessions: sess
      .slice(0, 3)
      .map((s) => ({ showTimeClt: s.showTimeClt, title: s.title })),
  }));
}
