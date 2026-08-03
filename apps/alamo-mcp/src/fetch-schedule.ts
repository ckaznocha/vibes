import { createTtlCache } from "./cache.ts";

export interface Cinema {
  city?: string;
  id: string;
  latitude?: number;
  longitude?: number;
  name: string;
  slug: string;
  state?: string;
  street1?: string;
  timeZoneName?: string;
}

export interface Presentation {
  show: { title: string };
  slug: string;
}

export interface ScheduleFeed {
  cinemas: Cinema[];
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

function isValidCinema(c: unknown): c is Cinema {
  if (!c || typeof c !== "object") return false;
  const cinema = c as { id?: unknown; name?: unknown; slug?: unknown };
  return (
    typeof cinema.id === "string" &&
    typeof cinema.name === "string" &&
    typeof cinema.slug === "string"
  );
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

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Cinema metadata is enrichment layered on top of the showtimes, so unlike
 * presentations/sessions this parses fail-closed (drop what doesn't fit, never throw):
 * a drifted `data.market` shape should cost callers cinema names, not every showtime in
 * the feed.
 */
function parseCinemas(rawMarket: unknown): Cinema[] {
  if (!Array.isArray(rawMarket)) return [];
  return rawMarket.flatMap((market: unknown) => {
    const cinemas = (market as null | { cinemas?: unknown })?.cinemas;
    if (!Array.isArray(cinemas)) return [];
    return cinemas.filter(isValidCinema).map((c) => {
      const raw = c as unknown as Record<string, unknown>;
      const city = optionalString(raw["city"]);
      const latitude = optionalNumber(raw["latitude"]);
      const longitude = optionalNumber(raw["longitude"]);
      const state = optionalString(raw["state"]);
      const street1 = optionalString(raw["street1"]);
      const timeZoneName = optionalString(raw["timeZoneName"]);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        ...(city !== undefined && { city }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(state !== undefined && { state }),
        ...(street1 !== undefined && { street1 }),
        ...(timeZoneName !== undefined && { timeZoneName }),
      };
    });
  });
}

function parseFeed(raw: unknown): ScheduleFeed {
  const data = (raw as null | { data?: unknown })?.data as
    | undefined
    | { market?: unknown; presentations?: unknown; sessions?: unknown };
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
  return {
    cinemas: parseCinemas(data.market),
    presentations: data.presentations,
    sessions: data.sessions,
  };
}
