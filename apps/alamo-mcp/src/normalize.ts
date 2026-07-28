import type { ScheduleFeed } from "./fetch-schedule.ts";

export interface NormalizedSession {
  cinemaId: string;
  presentationSlug: string;
  sessionId: string;
  showTimeClt: string;
  title: string;
}

export function normalizeSessions(feed: ScheduleFeed): NormalizedSession[] {
  const titleBySlug = new Map(
    feed.presentations.map((p) => [p.slug, p.show.title]),
  );
  return feed.sessions.map((s) => {
    const raw = s as { id?: string; sessionId?: string };
    const composite = `${s.cinemaId}|${s.showTimeClt}|${s.presentationSlug}`;
    return {
      cinemaId: s.cinemaId,
      presentationSlug: s.presentationSlug,
      sessionId: raw.sessionId ?? raw.id ?? composite,
      showTimeClt: s.showTimeClt,
      title: titleBySlug.get(s.presentationSlug) ?? s.presentationSlug,
    };
  });
}
