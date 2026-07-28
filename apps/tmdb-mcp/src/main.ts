import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
import { createResilientFetch } from "@ckaznocha/resilient-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getTmdbClient } from "./client.ts";
import { findByExternalId } from "./find-by-external-id.ts";
import { getMovieDetails } from "./movie.ts";
import { getPersonDetails } from "./person.ts";
import { searchMovies, searchMulti, searchPeople, searchTv } from "./search.ts";
import { getTrending } from "./trending.ts";
import { getTvDetails } from "./tv.ts";
import { getWatchProviders } from "./watch-providers.ts";

const server = new McpServer(
  {
    description:
      "General-purpose TMDB (The Movie Database) lookups: search, details, watch providers, " +
      "trending, and cross-referencing by external id. Standalone — not specific to any other " +
      "server in this workspace, but commonly paired with letterboxd-mcp and alamo-mcp to " +
      "resolve TMDB ids and metadata for titles those servers return.",
    name: "tmdb-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "Requires TMDB_API_KEY (a TMDB v4 read-access token, not the shorter v3 API key). " +
      "letterboxd-mcp's get_watchlist and alamo-mcp's list_cinemas/get_sessions all return " +
      "titles with no TMDB id attached — call search_movies (or search_tv/search_multi) here " +
      "with a returned title/year to resolve one, then get_movie_details/get_tv_details for " +
      "full metadata. find_by_external_id resolves an id from another source (e.g. an IMDb " +
      "id) directly to a TMDB entry.",
  },
);

// TMDB documents a ~50 requests/second limit; stay comfortably under it.
const fetchImpl = createResilientFetch({
  throttle: { concurrency: 10, intervalCap: 40, intervalMs: 1000 },
});

function requireClient() {
  const apiKey = process.env["TMDB_API_KEY"];
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is required");
  }
  return getTmdbClient(apiKey, fetchImpl);
}

server.registerTool(
  "search_movies",
  {
    description:
      "Search TMDB for movies by title — e.g. to resolve a TMDB id for a title returned by " +
      "letterboxd-mcp's get_watchlist or alamo-mcp's get_sessions.",
    inputSchema: {
      page: z.number().int().min(1).optional(),
      query: z.string().describe("Movie title to search for"),
      year: z.number().int().optional().describe("Primary release year"),
    },
  },
  async ({ page, query, year }) => {
    try {
      const client = requireClient();
      return toolResult(
        await searchMovies(client, {
          query,
          ...(page !== undefined && { page }),
          ...(year !== undefined && { year }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "search_tv",
  {
    description: "Search TMDB for TV shows by title.",
    inputSchema: {
      page: z.number().int().min(1).optional(),
      query: z.string().describe("TV show title to search for"),
      year: z.number().int().optional().describe("First air date year"),
    },
  },
  async ({ page, query, year }) => {
    try {
      const client = requireClient();
      return toolResult(
        await searchTv(client, {
          query,
          ...(page !== undefined && { page }),
          ...(year !== undefined && { year }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "search_people",
  {
    description: "Search TMDB for actors, directors, and other people.",
    inputSchema: {
      page: z.number().int().min(1).optional(),
      query: z.string().describe("Person name to search for"),
    },
  },
  async ({ page, query }) => {
    try {
      const client = requireClient();
      return toolResult(
        await searchPeople(client, {
          query,
          ...(page !== undefined && { page }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "search_multi",
  {
    description:
      "Search TMDB across movies, TV shows, and people in a single call. Useful when the media type is unknown or ambiguous.",
    inputSchema: {
      page: z.number().int().min(1).optional(),
      query: z.string().describe("Free-text search query"),
    },
  },
  async ({ page, query }) => {
    try {
      const client = requireClient();
      return toolResult(
        await searchMulti(client, {
          query,
          ...(page !== undefined && { page }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const movieAppendKeys = [
  "credits",
  "videos",
  "recommendations",
  "similar",
  "external_ids",
  "watch/providers",
  "keywords",
  "release_dates",
] as const;

server.registerTool(
  "get_movie_details",
  {
    description:
      "Get full details for a TMDB movie by id, optionally including credits, videos, recommendations, similar titles, external ids, watch providers, keywords, or release dates in the same call.",
    inputSchema: {
      appendToResponse: z.array(z.enum(movieAppendKeys)).optional(),
      language: z.string().optional().describe("ISO 639-1 language code"),
      movieId: z.number().int().describe("TMDB movie id"),
    },
  },
  async ({ appendToResponse, language, movieId }) => {
    try {
      const client = requireClient();
      return toolResult(
        await getMovieDetails(client, {
          movieId,
          ...(appendToResponse !== undefined && {
            appendToResponse: [...appendToResponse],
          }),
          ...(language !== undefined && { language }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const tvAppendKeys = [
  "credits",
  "aggregate_credits",
  "videos",
  "recommendations",
  "similar",
  "external_ids",
  "watch/providers",
  "keywords",
  "content_ratings",
] as const;

server.registerTool(
  "get_tv_details",
  {
    description:
      "Get full details for a TMDB TV show by id, optionally including credits, videos, recommendations, similar titles, external ids, watch providers, keywords, or content ratings in the same call.",
    inputSchema: {
      appendToResponse: z.array(z.enum(tvAppendKeys)).optional(),
      language: z.string().optional().describe("ISO 639-1 language code"),
      tvId: z.number().int().describe("TMDB TV show id"),
    },
  },
  async ({ appendToResponse, language, tvId }) => {
    try {
      const client = requireClient();
      return toolResult(
        await getTvDetails(client, {
          tvId,
          ...(appendToResponse !== undefined && {
            appendToResponse: [...appendToResponse],
          }),
          ...(language !== undefined && { language }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const personAppendKeys = [
  "movie_credits",
  "tv_credits",
  "combined_credits",
  "external_ids",
  "images",
] as const;

server.registerTool(
  "get_person_details",
  {
    description:
      "Get full details for a TMDB person by id, optionally including movie credits, TV credits, combined credits, external ids, or images in the same call.",
    inputSchema: {
      appendToResponse: z.array(z.enum(personAppendKeys)).optional(),
      language: z.string().optional().describe("ISO 639-1 language code"),
      personId: z.number().int().describe("TMDB person id"),
    },
  },
  async ({ appendToResponse, language, personId }) => {
    try {
      const client = requireClient();
      return toolResult(
        await getPersonDetails(client, {
          personId,
          ...(appendToResponse !== undefined && {
            appendToResponse: [...appendToResponse],
          }),
          ...(language !== undefined && { language }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_watch_providers",
  {
    description:
      "List streaming/rental/purchase providers TMDB knows about for movies or TV, optionally scoped to a region (powered by JustWatch). For providers of a specific title, use get_movie_details/get_tv_details with appendToResponse: ['watch/providers'] instead.",
    inputSchema: {
      mediaType: z.enum(["movie", "tv"]),
      region: z
        .string()
        .optional()
        .describe("ISO 3166-1 country code, e.g. 'US'"),
    },
  },
  async ({ mediaType, region }) => {
    try {
      const client = requireClient();
      return toolResult(
        await getWatchProviders(client, {
          mediaType,
          ...(region !== undefined && { region }),
        }),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

const externalSources = [
  "imdb_id",
  "freebase_mid",
  "freebase_id",
  "tvdb_id",
  "tvrage_id",
  "facebook_id",
  "twitter_id",
  "instagram_id",
] as const;

server.registerTool(
  "find_by_external_id",
  {
    description:
      "Look up a TMDB movie/TV/person by an id from another source (e.g. an IMDb id like 'tt0133093').",
    inputSchema: {
      externalId: z.string().describe("The id from the external source"),
      source: z.enum(externalSources),
    },
  },
  async ({ externalId, source }) => {
    try {
      const client = requireClient();
      return toolResult(await findByExternalId(client, { externalId, source }));
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_trending",
  {
    description: "List trending movies, TV shows, or people on TMDB.",
    inputSchema: {
      mediaType: z.enum(["all", "movie", "tv", "person"]),
      timeWindow: z.enum(["day", "week"]),
    },
  },
  async ({ mediaType, timeWindow }) => {
    try {
      const client = requireClient();
      return toolResult(await getTrending(client, { mediaType, timeWindow }));
    } catch (error) {
      return toolError(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("tmdb-mcp running on stdio");
