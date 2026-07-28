import { createTtlCache } from "./cache.ts";

export interface Presentation {
  show: { title: string };
  slug: string;
}

export interface ScheduleFeed {
  presentations: Presentation[];
  sessions: Session[];
}
export interface Session {
  cinemaId: string;
  id?: string;
  presentationSlug: string;
  sessionId?: string;
  showTimeClt: string;
}
export class ScheduleFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleFeedError";
  }
}

export function createScheduleFetcher(
  options: {
    fetchImpl?: typeof fetch;
    nowImpl?: () => number;
    ttlSec?: number;
  } = {},
): (market: string) => Promise<ScheduleFeed> {
  const { fetchImpl = fetch, nowImpl, ttlSec = 300 } = options;
  const cache = createTtlCache<ScheduleFeed>({
    ttlSec,
    ...(nowImpl !== undefined && { nowImpl }),
  });

  return async function fetchSchedule(market: string): Promise<ScheduleFeed> {
    const cached = cache.get(market);
    if (cached) return cached;

    const url = `https://drafthouse.com/s/mother/v2/schedule/market/${encodeURIComponent(market)}`;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(
        `alamo schedule fetch failed: HTTP ${String(response.status)} for ${url}`,
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ScheduleFeedError(
        `alamo schedule fetch returned a non-JSON response body for ${url}`,
      );
    }
    const feed = parseFeed(raw);
    cache.set(market, feed);
    return feed;
  };
}

function isValidPresentation(p: unknown): p is Presentation {
  if (!p || typeof p !== "object") return false;
  const pres = p as { show?: unknown; slug?: unknown };
  if (typeof pres.slug !== "string") return false;
  if (!pres.show || typeof pres.show !== "object") return false;
  return typeof (pres.show as { title?: unknown }).title === "string";
}

function isValidSession(s: unknown): s is Session {
  if (!s || typeof s !== "object") return false;
  const sess = s as {
    cinemaId?: unknown;
    presentationSlug?: unknown;
    showTimeClt?: unknown;
  };
  return (
    typeof sess.cinemaId === "string" &&
    typeof sess.showTimeClt === "string" &&
    typeof sess.presentationSlug === "string"
  );
}

function parseFeed(raw: unknown): ScheduleFeed {
  const data = (raw as null | { data?: unknown })?.data as
    undefined | { presentations?: unknown; sessions?: unknown };
  if (
    !data ||
    !Array.isArray(data.presentations) ||
    !Array.isArray(data.sessions)
  ) {
    throw new ScheduleFeedError(
      "feed shape changed: missing data.presentations/data.sessions",
    );
  }
  if (!data.presentations.every(isValidPresentation)) {
    throw new ScheduleFeedError(
      "feed shape changed: a presentation is missing slug/show.title",
    );
  }
  if (!data.sessions.every(isValidSession)) {
    throw new ScheduleFeedError(
      "feed shape changed: a session is missing cinemaId/showTimeClt/presentationSlug",
    );
  }
  return { presentations: data.presentations, sessions: data.sessions };
}
