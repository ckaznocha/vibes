import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
import { createResilientFetch } from "@ckaznocha/resilient-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { parseCrawlDelayMs } from "./config.ts";
import { getWatchlist } from "./get-watchlist.ts";

// Scraping someone else's HTML — page-to-page pacing is already handled by
// crawlDelayMs, so concurrency stays at 1 here; this only adds retry+circuit-breaking
// for transient failures (a dropped connection, a flaky 502/503) mid-crawl.
const fetchImpl = createResilientFetch({
  throttle: { concurrency: 1 },
});

const server = new McpServer(
  {
    description:
      "Scrapes a Letterboxd user's public watchlist. The only source of Letterboxd data in " +
      "this workspace — has no TMDB integration of its own.",
    name: "letterboxd-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "get_watchlist returns titles/years exactly as scraped from Letterboxd, with no TMDB " +
      "ids or metadata attached. To resolve a TMDB id, poster, rating, or other metadata for " +
      "a title returned here, call tmdb-mcp's search_movies with that title and year.",
  },
);

server.registerTool(
  "get_watchlist",
  {
    description:
      "Scrape a Letterboxd user's public watchlist. Returns titles/years exactly as scraped " +
      "from Letterboxd, with no TMDB ids — pass a returned title/year to tmdb-mcp's " +
      "search_movies to resolve one.",
    inputSchema: {
      username: z.string().describe("Letterboxd username"),
    },
  },
  async ({ username }) => {
    try {
      const films = await getWatchlist({
        crawlDelayMs: parseCrawlDelayMs(
          process.env["LETTERBOXD_CRAWL_DELAY_MS"],
        ),
        fetchImpl,
        username,
      });
      return toolResult({ films });
    } catch (error) {
      return toolError(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("letterboxd-mcp running on stdio");
