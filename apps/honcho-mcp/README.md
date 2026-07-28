# honcho-mcp

[![npm](https://img.shields.io/npm/v/%40ckaznocha%2Fhoncho-mcp)](https://www.npmjs.com/package/@ckaznocha/honcho-mcp)

A standalone stdio MCP server exposing a self-hosted [Honcho](https://honcho.dev) instance:
semantic search, dialectic chat, context/representation snapshots, and conclusion CRUD. Built on
the official `@honcho-ai/sdk` TypeScript client.

## Why

A self-hosted [Honcho](https://honcho.dev) instance gives every agent in a
user's stack a shared, cross-session memory of them — but Claude Desktop,
OpenCode, and other generic stdio MCP clients have no built-in way to reach
it (only the `plastic-labs/claude-honcho` Claude Code plugin does). This
server exposes the same search/chat/context/conclusion operations over plain
stdio, so that memory stays portable across whichever client is in front of
the user.

## Tools

| Tool                                           | Purpose                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `search(query, limit?)`                        | Semantic search over workspace memory                                        |
| `chat(question, reasoning_level?)`             | Dialectic answer from the assistant peer's view of the user                  |
| `get_context(max_conclusions?, search_query?)` | Assistant's representation + peer card of the user                           |
| `get_representation()`                         | Just the assistant's representation of the user (lighter than `get_context`) |
| `create_conclusion(content)`                   | Save a durable fact about the user, authored by the assistant peer           |
| `list_conclusions(page?, size?)`               | Paginated list of saved conclusions                                          |
| `delete_conclusion(id)`                        | Delete a conclusion by id                                                    |

## Config

Reads `~/.honcho/config.json` by default for `apiKey`, `workspace`, `peerName`, and
`endpoint.baseUrl`. Overridable via env — each var takes precedence over the config file:

| Env                | Default                                                               |
| ------------------ | --------------------------------------------------------------------- |
| `HONCHO_CONFIG`    | `~/.honcho/config.json`                                               |
| `HONCHO_BASE_URL`  | `endpoint.baseUrl` in the config file, or `http://localhost:49317/v3` |
| `HONCHO_WORKSPACE` | `workspace` in the config file, or `hermes`                           |
| `HONCHO_USER_PEER` | `peerName` in the config file, or `user`                              |
| `HONCHO_ASSISTANT` | `claude-desktop` (author of saved conclusions)                        |
| `HONCHO_API_KEY`   | `apiKey` in the config file                                           |

## Run

From a local clone of the `vibes` monorepo:

```sh
pnpm install
npx nx build honcho-mcp
node apps/honcho-mcp/dist/main.js
```

Or via npm, once published:

```sh
npx honcho-mcp
```

## MCP client config example

From a local clone:

```json
"honcho": {
  "command": "node",
  "args": ["/Users/<you>/src/github.com/ckaznocha/vibes/apps/honcho-mcp/dist/main.js"]
}
```

Or via npx, once published:

```json
"honcho": {
  "command": "npx",
  "args": ["-y", "honcho-mcp"]
}
```
