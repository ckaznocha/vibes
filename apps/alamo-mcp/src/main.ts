import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
import { createResilientExecutor } from "@ckaznocha/resilient-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { bestSeats } from "./best-seats.ts";
import { bookingUrl } from "./booking-url.ts";
import { createBrowserCapture } from "./browser.ts";
import { optionalEnvironment } from "./environment.ts";
import { createScheduleFetcher } from "./fetch-schedule.ts";
import { filterSessions } from "./get-sessions.ts";
import { listCinemas } from "./list-cinemas.ts";
import { normalizeSessions } from "./normalize.ts";
import { parseCacheTtlSec } from "./parse-ttl.ts";
import { getSeatmap } from "./seatmap.ts";

const DEFAULT_MARKET =
  optionalEnvironment(process.env["ALAMO_MARKET"]) ?? "austin";
const CDP_URL =
  optionalEnvironment(process.env["ALAMO_BROWSER_CDP_URL"]) ??
  "http://localhost:9222";
const CACHE_TTL_SEC = parseCacheTtlSec(
  optionalEnvironment(process.env["ALAMO_SCHEDULE_CACHE_TTL_SEC"]),
);

// Every Alamo request is a real page load in a real browser, so one at a time and no
// faster than a person could click. Retry/circuit-breaking wraps the navigation rather
// than a fetch, since there is no fetch of our own left to wrap.
const browser = createBrowserCapture({ cdpUrl: CDP_URL });
const execute = createResilientExecutor({
  throttle: { concurrency: 1, intervalCap: 1, intervalMs: 2000 },
});
const capture: typeof browser.capture = (request) =>
  execute(() => browser.capture(request));

const fetchSchedule = createScheduleFetcher({
  capture,
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
      "List the Alamo Drafthouse theaters in a market — cinemaId, name, address, coordinates, " +
      "and sample sessions — to identify the cinemaId to pass to get_sessions. Theaters with no " +
      "sessions scheduled are included with sessionCount 0.",
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
      const cinemas = listCinemas(normalizeSessions(feed), feed.cinemas);
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
      "Get the seat map for a session: every seat with its row, grid position, status " +
      "(available/unavailable), and style. Pass the cinemaId and sessionId from the same " +
      "get_sessions entry. Read-only — reporting a seat as available never holds or books it.",
    inputSchema: {
      businessDateClt: z
        .string()
        .describe(
          "businessDateClt of the session, as returned by get_sessions. Alamo's business " +
            "day runs 6am-5:59am, so do not substitute the calendar date of showTimeClt.",
        ),
      cinemaId: z
        .string()
        .describe("cinemaId of the session, as returned by get_sessions"),
      market: z
        .string()
        .optional()
        .describe(`Market slug (default "${DEFAULT_MARKET}")`),
      presentationSlug: z
        .string()
        .describe(
          "presentationSlug of the session, as returned by get_sessions",
        ),
      sessionId: z.string().describe("Session id as returned by get_sessions"),
    },
  },
  async ({
    businessDateClt,
    cinemaId,
    market,
    presentationSlug,
    sessionId,
  }) => {
    try {
      const seats = await getSeatmap({
        businessDateClt,
        capture,
        cinemaId,
        market: market ?? DEFAULT_MARKET,
        presentationSlug,
        sessionId,
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
      "Get the best-scored available seats for a session, ranked by a center-of-house " +
      "heuristic (horizontally centered, about two-thirds back). Lower score is better. " +
      "Read-only — this never holds or books a seat.",
    inputSchema: {
      businessDateClt: z
        .string()
        .describe(
          "businessDateClt of the session, as returned by get_sessions. Alamo's business " +
            "day runs 6am-5:59am, so do not substitute the calendar date of showTimeClt.",
        ),
      cinemaId: z
        .string()
        .describe("cinemaId of the session, as returned by get_sessions"),
      count: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of seats to return (default 1)"),
      market: z
        .string()
        .optional()
        .describe(`Market slug (default "${DEFAULT_MARKET}")`),
      presentationSlug: z
        .string()
        .describe(
          "presentationSlug of the session, as returned by get_sessions",
        ),
      sessionId: z.string().describe("Session id as returned by get_sessions"),
    },
  },
  async ({
    businessDateClt,
    cinemaId,
    count,
    market,
    presentationSlug,
    sessionId,
  }) => {
    try {
      const seats = await bestSeats({
        businessDateClt,
        capture,
        cinemaId,
        market: market ?? DEFAULT_MARKET,
        presentationSlug,
        sessionId,
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
console.error(`alamo-mcp running on stdio (browser at ${CDP_URL})`);

// Close the shared page/CDP connection on shutdown so we don't leave a stray tab open
// in the user's browser. Closing the transport and the connection drains the event loop,
// so the process exits on its own without a hard process.exit().
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void (async () => {
      await server.close();
      await browser.close();
    })();
  });
}
