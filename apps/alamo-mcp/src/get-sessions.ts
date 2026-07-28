import type { NormalizedSession } from "./normalize.ts";

export function filterSessions(
  sessions: NormalizedSession[],
  cinemaId?: string,
): NormalizedSession[] {
  if (!cinemaId) return sessions;
  return sessions.filter((s) => s.cinemaId === cinemaId);
}
