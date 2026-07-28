# mcp-tool-result

`scope:shared` lib — wraps a tool handler's return value or a caught error
into the MCP SDK's `content`-array response shape, so every
`type:mcp-server` project formats results and errors the same way instead of
reinventing it per tool.

## API

```ts
import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
```

| Export       | Signature                             | Returns                                                                                         |
| ------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `toolResult` | `(data: unknown) => ToolResultOk`     | `{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }`                          |
| `toolError`  | `(error: unknown) => ToolResultError` | Same shape plus `isError: true`; uses `error.message` for an `Error`, otherwise `String(error)` |

## Usage

```ts
server.registerTool("get_watchlist", schema, async ({ username }) => {
  try {
    return toolResult(await fetchWatchlist(username));
  } catch (error) {
    return toolError(error);
  }
});
```

## Used by

`alamo-mcp`, `honcho-mcp`, `letterboxd-mcp`, `tmdb-mcp` — every tool handler
in each returns one of `toolResult(...)` or `toolError(...)`.

## Development

```sh
pnpm exec nx test mcp-tool-result
pnpm exec nx typecheck mcp-tool-result
```

No build target — this is a TS-source-only lib; consuming apps' esbuild
bundlers read `src/index.ts` directly.
