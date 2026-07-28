---
name: new-mcp-tool
description: Add a new MCP tool to any project tagged type:mcp-server in this workspace. Use when the user asks to add, expose, or wire up a new tool/capability on an MCP server.
---

# Add a new MCP tool

Every project tagged `type:mcp-server` follows the same shape in `<root>/src/main.ts`:
business logic lives in its own file, `main.ts` only wires it into
`server.registerTool`. Follow [[project-conventions]] for file layout and testing
conventions while doing this. If more than one `type:mcp-server` project exists and it
isn't obvious which one this tool belongs to, ask, or run
`nx show projects -p "tag:type:mcp-server" --json` to list the candidates.

## Steps

1. **Check whether this logic already exists before writing it.** Grep sibling
   `type:mcp-server` projects' `src/` (`nx show projects -p "tag:type:mcp-server"
--json`) and `libs/*` for a function doing the same thing — not just a similarly-named
   one. If two or more projects genuinely need the same concern (not just a similar
   shape), extract/reuse it via a `scope:shared` lib using the `new-lib` skill instead of
   writing a second copy. See CLAUDE.md's "Adding a new project" item 11 for the litmus
   test on when extraction is actually warranted (it usually isn't just because two
   functions look alike) — when in doubt, ask the user rather than guessing.
2. **Implement the logic in its own file**, `src/<verb-noun>.ts`, independent of MCP — it
   should be a plain function callable and testable without a server/transport. Look at an
   existing sibling tool implementation in the same project (or another
   `type:mcp-server`-tagged project — `nx show projects -p "tag:type:mcp-server"`) for the
   shape. **If it makes an outbound network call** (a raw `fetch()` or an SDK client with no
   `fetch` injection point), wrap it with the shared `resilient-fetch` lib rather than
   calling the network directly — see [[project-conventions]]'s "Network calls" section.
3. **Write `src/<verb-noun>.test.ts` alongside it** using `node --test` (not Jest/Vitest).
   If the function parses third-party data, add a fixture in `src/fixtures/` for the
   malformed/empty case too — see [[project-conventions]].
4. **Register the tool in `main.ts`**, using `toolResult`/`toolError` from the shared
   `mcp-tool-result` lib (every `type:mcp-server` project already depends on it) rather
   than hand-building the `{ content: [...] }` shape inline:
   ```ts
   import { toolError, toolResult } from "@ckaznocha/mcp-tool-result";
   // ...
   server.registerTool(
     "tool_name", // snake_case, verb_noun
     {
       description:
         "One sentence: what it does, and any prerequisite tool to call first.",
       inputSchema: {
         someParam: z
           .string()
           .optional()
           .describe("What this controls, and its default."),
       },
     },
     async ({ someParam }) => {
       try {
         const result = await yourFunction({ someParam });
         return toolResult({ result });
       } catch (error) {
         return toolError(error);
       }
     },
   );
   ```
   Always wrap the handler body in `try`/`catch` returning `toolError(error)` — every
   existing tool in every `type:mcp-server` project's `main.ts` does this; an uncaught
   throw kills the MCP connection instead of surfacing an error to the caller.
5. **If the tool needs new env-var configuration**, read it once at module top-level next
   to the existing `process.env["..."]` reads in `main.ts`, with a sane default.
6. **Update the project's `README.md`** to list the new tool alongside the existing ones.
7. **If this tool relates to another `type:mcp-server` project** (e.g. it consumes an id
   or title another server's tool returns, or another server would need to call this one
   to resolve something it can't itself), say so in both the tool's `description` and the
   server's top-level `instructions` (the `McpServer` constructor's second argument) —
   see `apps/tmdb-mcp/src/main.ts` and `apps/letterboxd-mcp/src/main.ts` for the pattern.
   An agent choosing between tools across multiple connected MCP servers can only see
   these descriptions, not this repo's source, so the cross-server relationship has to be
   stated there or it's invisible at call time.
8. **Verify**: `nx run <project>:lint,typecheck,test,build`.

## Naming

Tool names are `snake_case` verbs (`list_cinemas`, `get_sessions`, `booking_url` are the
existing examples) — don't introduce camelCase or kebab-case tool names.

## New `type:mcp-server` project?

If this is the _first_ tool on a brand-new project rather than an addition to an existing
one, make sure it's tagged `type:mcp-server` (plus `publish:npm` if it'll ship to npm, and
`data-source:scraping` if it parses uncontracted third-party data) in its `project.json` —
that's what makes it discoverable to this skill and to the `security-reviewer` /
`scrape-resilience-reviewer` / `release-gatekeeper` agents going forward.
