import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
import { createResilientFetch } from "@ckaznocha/resilient-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { bestSeats } from "./best-seats.ts";
import { bookingUrl } from "./booking-url.ts";
import { createScheduleFetcher } from "./fetch-schedule.ts";
import { filterSessions } from "./get-sessions.ts";
import { listCinemas } from "./list-cinemas.ts";
import { normalizeSessions } from "./normalize.ts";
import { parseCacheTtlSec } from "./parse-ttl.ts";
import { getSeatmap } from "./seatmap.ts";

const DEFAULT_MARKET = process.env["ALAMO_MARKET"] ?? "los-angeles";
const SEAT_URL_TEMPLATE = process.env["ALAMO_SEAT_URL_TEMPLATE"];
const CACHE_TTL_SEC = parseCacheTtlSec(
  process.env["ALAMO_SCHEDULE_CACHE_TTL_SEC"],
);

// Alamo's schedule feed is an unofficial, undocumented API — stay conservative on
// concurrency/rate to avoid drawing attention, and lean on retry+circuit-breaking to
// ride out its occasional transient failures.
const fetchImpl = createResilientFetch({
  throttle: { concurrency: 2, intervalCap: 10, intervalMs: 1000 },
});
const fetchSchedule = createScheduleFetcher({
  fetchImpl,
  ttlSec: CACHE_TTL_SEC,
});

const server = new McpServer(
  {
    description:
      "Alamo Drafthouse showtimes, seat maps, and a booking deep link for a market. Never " +
      "books anything — booking_url only returns a link for the user to complete themselves. " +
      "Has no TMDB integration of its own.",
    name: "alamo-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "Session titles (from list_cinemas/get_sessions) are Alamo's own listing titles, with " +
      "no TMDB id attached. Call tmdb-mcp's search_movies with a session's title to look up " +
      "metadata, ratings, or a poster for it if needed.",
  },
);

server.registerTool(
  "list_cinemas",
  {
    description:
      "List distinct Alamo Drafthouse cinemaIds in a market with sample sessions, to identify a theater id.",
    inputSchema: {
      market: z
        .string()
        .optional()
        .describe(`Market slug (default "${DEFAULT_MARKET}")`),
    },
  },
  async ({ market }) => {
    try {
      const feed = await fetchSchedule(market ?? DEFAULT_MARKET);
      const cinemas = listCinemas(normalizeSessions(feed));
      return toolResult({ cinemas });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_sessions",
  {
    description:
      "Get normalized Alamo Drafthouse showtimes for a market, optionally filtered to a cinemaId. " +
      "Call list_cinemas first to discover cinemaIds — call get_sessions once per cinemaId to " +
      "compare showtimes across theaters. Returned titles are Alamo's own listing titles, with " +
      "no TMDB id — pass one to tmdb-mcp's search_movies to resolve metadata if needed.",
    inputSchema: {
      cinemaId: z
        .string()
        .optional()
        .describe(
          "Filter to this cinemaId (from list_cinemas). Omit to get every cinema in the market.",
        ),
      market: z
        .string()
        .optional()
        .describe(`Market slug (default "${DEFAULT_MARKET}")`),
    },
  },
  async ({ cinemaId, market }) => {
    try {
      const feed = await fetchSchedule(market ?? DEFAULT_MARKET);
      const sessions = filterSessions(normalizeSessions(feed), cinemaId);
      return toolResult({ sessions });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_seatmap",
  {
    description:
      "Get the seat map for a session. Experimental: requires ALAMO_SEAT_URL_TEMPLATE to be configured.",
    inputSchema: {
      sessionId: z.string().describe("Session id as returned by get_sessions"),
    },
  },
  async ({ sessionId }) => {
    try {
      const seats = await getSeatmap({
        sessionId,
        ...(SEAT_URL_TEMPLATE !== undefined && {
          seatUrlTemplate: SEAT_URL_TEMPLATE,
        }),
      });
      return toolResult({ seats });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "best_seats",
  {
    description:
      "Get the best-scored available seats for a session (center-of-house heuristic). Experimental, same requirement as get_seatmap.",
    inputSchema: {
      count: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of seats to return (default 1)"),
      sessionId: z.string().describe("Session id as returned by get_sessions"),
    },
  },
  async ({ count, sessionId }) => {
    try {
      const seats = await bestSeats({
        sessionId,
        ...(SEAT_URL_TEMPLATE !== undefined && {
          seatUrlTemplate: SEAT_URL_TEMPLATE,
        }),
        ...(count !== undefined && { count }),
      });
      return toolResult({ seats });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "booking_url",
  {
    description:
      "Build the Alamo Drafthouse booking deep link for a presentation (does not book anything).",
    inputSchema: {
      market: z
        .string()
        .optional()
        .describe(`Market slug (default "${DEFAULT_MARKET}")`),
      presentationSlug: z
        .string()
        .describe("presentationSlug from get_sessions"),
    },
  },
  ({ market, presentationSlug }) => {
    try {
      const url = bookingUrl({
        market: market ?? DEFAULT_MARKET,
        presentationSlug,
      });
      return toolResult({ url });
    } catch (error) {
      return toolError(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("alamo-mcp running on stdio");
