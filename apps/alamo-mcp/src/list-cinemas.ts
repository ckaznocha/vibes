import type { Cinema } from "./fetch-schedule.ts";
import type { NormalizedSession } from "./normalize.ts";

export interface CinemaSample {
  address?: string;
  cinemaId: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  sampleSessions: { showTimeClt: string; title: string }[];
  sessionCount: number;
  slug?: string;
  timeZoneName?: string;
}

/**
 * Cinemas the feed knows about come first, in feed order, whether or not they have
 * sessions today — a theater with nothing scheduled is still a real answer to "which
 * theaters are in this market". Any cinemaId seen only on a session (metadata drifted or
 * absent) is appended bare rather than dropped.
 */
export function listCinemas(
  sessions: NormalizedSession[],
  cinemas: Cinema[] = [],
): CinemaSample[] {
  const byCinema = new Map<string, NormalizedSession[]>();
  for (const s of sessions) {
    const array = byCinema.get(s.cinemaId) ?? [];
    array.push(s);
    byCinema.set(s.cinemaId, array);
  }

  const sample = (sess: NormalizedSession[]): CinemaSample["sampleSessions"] =>
    sess
      .slice(0, 3)
      .map((s) => ({ showTimeClt: s.showTimeClt, title: s.title }));

  const known = cinemas.map((cinema) => {
    const sess = byCinema.get(cinema.id) ?? [];
    const address = formatAddress(cinema);
    return {
      cinemaId: cinema.id,
      name: cinema.name,
      sampleSessions: sample(sess),
      sessionCount: sess.length,
      slug: cinema.slug,
      ...(address !== undefined && { address }),
      ...(cinema.latitude !== undefined && { latitude: cinema.latitude }),
      ...(cinema.longitude !== undefined && { longitude: cinema.longitude }),
      ...(cinema.timeZoneName !== undefined && {
        timeZoneName: cinema.timeZoneName,
      }),
    };
  });

  const knownIds = new Set(cinemas.map((c) => c.id));
  const unknown = [...byCinema]
    .filter(([cinemaId]) => !knownIds.has(cinemaId))
    .map(([cinemaId, sess]) => ({
      cinemaId,
      sampleSessions: sample(sess),
      sessionCount: sess.length,
    }));

  return [...known, ...unknown];
}

function formatAddress(cinema: Cinema): string | undefined {
  const cityState = [cinema.city, cinema.state].filter(Boolean).join(", ");
  const parts = [cinema.street1, cityState].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}
