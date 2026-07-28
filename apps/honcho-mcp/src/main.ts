import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
import { createResilientExecutor } from "@ckaznocha/resilient-fetch";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { chatWithPeer } from "./chat.ts";
import { getHonchoClient } from "./client.ts";
import {
  createConclusion,
  deleteConclusion,
  listConclusions,
} from "./conclusions.ts";
import { resolveConfig } from "./config.ts";
import { getPeerContext, getPeerRepresentation } from "./context.ts";
import { searchWorkspace } from "./search.ts";

const config = resolveConfig();
const honcho = getHonchoClient(config);

// The Honcho SDK exposes no fetch injection point, so calls are wrapped at the
// call site instead of at the transport layer. Self-hosted and loopback-only, so
// no rate throttling is needed here — this is purely retry+circuit-breaking for
// transient failures (e.g. a server restart mid-request).
const execute = createResilientExecutor();

function createPeersResolver() {
  let peersReady:
    | Promise<{
        assistantPeer: Awaited<ReturnType<typeof honcho.peer>>;
        conclusions: ReturnType<
          Awaited<ReturnType<typeof honcho.peer>>["conclusionsOf"]
        >;
      }>
    | undefined;

  return function getPeers() {
    peersReady ??= (async () => {
      const assistantPeer = await execute(() => honcho.peer(config.assistant));
      const conclusions = assistantPeer.conclusionsOf(config.userPeer);
      return { assistantPeer, conclusions };
    })();
    return peersReady;
  };
}

const getPeers = createPeersResolver();

const server = new McpServer(
  {
    description:
      "Standalone stdio MCP server exposing a self-hosted Honcho memory instance: search, " +
      "dialectic chat, context/representation, and conclusion CRUD.",
    name: "honcho-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "Reads connection config from ~/.honcho/config.json by default (overridable via " +
      "HONCHO_CONFIG/HONCHO_BASE_URL/HONCHO_WORKSPACE/HONCHO_USER_PEER/HONCHO_ASSISTANT/" +
      "HONCHO_API_KEY env vars). All read (search/chat/get_context/get_representation) and " +
      "write (create_conclusion/list_conclusions/delete_conclusion) operations go through the " +
      "assistant peer's view of the user peer (observer=assistant, observed=user), so a fact " +
      "saved via create_conclusion is visible to subsequent get_context/chat/get_representation " +
      "calls.",
  },
);

server.registerTool(
  "search",
  {
    description: "Semantic search over the Honcho workspace memory.",
    inputSchema: {
      limit: z.number().int().min(1).max(50).optional(),
      query: z.string().describe("Search query"),
    },
  },
  async ({ limit, query }) => {
    try {
      return toolResult(
        await execute(() => searchWorkspace(honcho, query, limit)),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "chat",
  {
    description:
      "Ask Honcho's dialectic a natural-language question about the user, using the " +
      "assistant peer's view of the user.",
    inputSchema: {
      question: z.string().describe("Natural language question about the user"),
      reasoning_level: z
        .enum(["minimal", "low", "medium", "high", "max"])
        .optional()
        .describe("Reasoning budget for this query"),
    },
  },
  async ({ question, reasoning_level: reasoningLevel }) => {
    try {
      const { assistantPeer } = await getPeers();
      return toolResult({
        answer: await execute(() =>
          chatWithPeer(
            assistantPeer,
            question,
            reasoningLevel,
            config.userPeer,
          ),
        ),
      });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_context",
  {
    description:
      "Retrieve the assistant's representation + peer card of the user in one call.",
    inputSchema: {
      max_conclusions: z.number().int().min(1).optional(),
      search_query: z.string().optional().describe("Bias toward a topic"),
    },
  },
  async ({ max_conclusions: maxConclusions, search_query: searchQuery }) => {
    try {
      const { assistantPeer } = await getPeers();
      return toolResult(
        await execute(() =>
          getPeerContext(assistantPeer, {
            ...(maxConclusions !== undefined && { maxConclusions }),
            ...(searchQuery !== undefined && { searchQuery }),
            target: config.userPeer,
          }),
        ),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "get_representation",
  {
    description:
      "Retrieve just the assistant's representation string of the user (lighter than " +
      "get_context).",
    inputSchema: {},
  },
  async () => {
    try {
      const { assistantPeer } = await getPeers();
      return toolResult({
        representation: await execute(() =>
          getPeerRepresentation(assistantPeer, config.userPeer),
        ),
      });
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "create_conclusion",
  {
    description: "Save a durable fact about the user to Honcho memory.",
    inputSchema: {
      content: z.string().describe("The insight or fact to remember"),
    },
  },
  async ({ content }) => {
    try {
      const { conclusions } = await getPeers();
      return toolResult(
        await execute(() => createConclusion(conclusions, content)),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "list_conclusions",
  {
    description:
      "List conclusions Honcho has saved about the user. Use before creating duplicates, or " +
      "to find ids for deletion.",
    inputSchema: {
      page: z.number().int().min(1).optional(),
      size: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ page, size }) => {
    try {
      const { conclusions } = await getPeers();
      return toolResult(
        await execute(() => listConclusions(conclusions, page, size)),
      );
    } catch (error) {
      return toolError(error);
    }
  },
);

server.registerTool(
  "delete_conclusion",
  {
    description:
      "Delete a conclusion by id. Use list_conclusions to find the id first.",
    inputSchema: {
      id: z.string().describe("The conclusion id to delete"),
    },
  },
  async ({ id }) => {
    try {
      const { conclusions } = await getPeers();
      await execute(() => deleteConclusion(conclusions, id));
      return toolResult({ deleted: id });
    } catch (error) {
      return toolError(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
