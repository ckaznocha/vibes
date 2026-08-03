---
name: new-lib
description: Scaffold a new shared library under libs/* in this Nx + pnpm workspace. Use when creating a new libs/* package, or when project-conventions/CLAUDE.md points here to extract logic duplicated across two or more apps into a shared lib.
---

# Add a new shared lib

A `libs/<name>` package in this workspace is a plain TS-source-only package: no build
step, no bundler, consumed directly by whichever apps' esbuild `bundle: true` builds
import it. `libs/mcp-tool-result` is the reference example — copy its shape rather than
reinventing it. Every step below encodes a real error hit scaffolding
`libs/mcp-tool-result` and `libs/tmdb-client` the first time; skipping one reproduces it.

**Before scaffolding anything: is this actually a shared-lib case?** See CLAUDE.md's
"Adding a new project" item 11 for the litmus test — extract only when the _concern_
(not just the function shape) is genuinely owned by no single project. If one
`type:mcp-server` project exists specifically so others don't have to implement this
logic themselves (e.g. `tmdb-mcp` for TMDB access), the fix is to have the other
project(s) call it as a separate tool, not share a lib. If still unsure, ask the user
before creating the lib.

## Steps

1. **Pick a flat, descriptive name** — no `apps`/`libs` prefix, matches its
   `project.json` `name` (e.g. `mcp-tool-result`, not `libs-mcp-tool-result`). The
   `package.json` `name` is the same string prefixed with the workspace's npm scope,
   `@ckaznocha/` (e.g. `@ckaznocha/mcp-tool-result`) — every published or workspace-linked
   package in this repo carries that prefix (see CLAUDE.md's "Adding a new project" item
   12), while the Nx project name (`project.json`, tags, `nx run <name>:...`) stays
   unscoped.
2. **Create `libs/<name>/`** with:
   - `src/index.ts` — the public API, barrel-exported. One-concern libs can just
     implement directly in `index.ts` (see `libs/mcp-tool-result`); split into more
     files under `src/` only if the lib grows more than one concern.
   - `src/index.test.ts` (or one `.test.ts` per extra file) — `node --test`, co-located,
     same convention as `type:mcp-server` projects' `project-conventions`.
   - `tsconfig.json` and `tsconfig.spec.json` — copy `libs/mcp-tool-result`'s verbatim
     (extends `../../tsconfig.base.json`, no `tsconfig.app.json` — there's no build).
   - `project.json`:
     ```json
     {
       "name": "<name>",
       "$schema": "../../node_modules/nx/schemas/project-schema.json",
       "sourceRoot": "libs/<name>/src",
       "projectType": "library",
       "targets": {
         "typecheck": {
           "cache": true,
           "inputs": [
             "{projectRoot}/src/**/*.ts",
             "{projectRoot}/tsconfig.spec.json",
             "{workspaceRoot}/tsconfig.base.json"
           ],
           "outputs": [],
           "executor": "nx:run-commands",
           "options": {
             "cwd": "libs/<name>",
             "command": "tsc -p tsconfig.spec.json --noEmit"
           }
         },
         "test": {
           "executor": "nx:run-commands",
           "cache": true,
           "inputs": ["default", "^production", { "externalDependencies": [] }],
           "options": { "command": "node --test", "cwd": "libs/<name>" }
         }
       },
       "tags": ["scope:shared", "type:lib"]
     }
     ```
     No `build` or `serve` target — this project
     never ships or runs standalone. `tags` is almost always exactly
     `["scope:shared", "type:lib"]`; only give it a single app's `scope:<project>`
     instead of `scope:shared` in the rare case it's genuinely private to one app (at
     which point ask whether it needs to be a lib at all, vs. just another file in that
     app's `src/`).
   - `package.json`:
     ```json
     {
       "name": "@ckaznocha/<name>",
       "version": "0.1.0",
       "license": "MIT",
       "private": true,
       "type": "module",
       "main": "./src/index.ts",
       "types": "./src/index.ts",
       "exports": { ".": "./src/index.ts" },
       "engines": { "node": ">=24" }
     }
     ```
     **All three of `main`, `types`, and `exports` are required, not just `exports`** —
     omitting `main`/`types` makes `@nx/dependency-checks` (an ESLint rule) fail to
     resolve the package and wrongly flag it as unused in every consumer's
     `package.json`, even though `tsc` and Node both resolve it fine from `exports`
     alone. Add any runtime `dependencies` the lib itself needs here (see
     `libs/tmdb-client`'s history — reverted, but its `package.json` was still a correct
     example of this pattern while it existed).
3. **Add it to root `tsconfig.json`'s `references`** — `{ "path": "./libs/<name>" }`,
   alongside the existing entries. The `@nx/js/typescript` sync generator does **not**
   do this automatically in this workspace (see CLAUDE.md item 6) — every project here
   overrides its inferred targets with hand-written ones, which stops the generator from
   engaging.
4. **Add `"libs/*"` to `pnpm-workspace.yaml`'s `packages` list, if it isn't there
   already** (it will be, once the first lib exists — check before assuming you need
   this step).
5. **Wire `eslint.config.ts`'s `@nx/enforce-module-boundaries` `depConstraints`** so
   consumers are actually allowed to import it:
   - If tagged `scope:shared`: confirm the `scope:shared` constraint
     (`{ sourceTag: "scope:shared", onlyDependOnLibsWithTags: ["scope:shared"] }`) and
     every consuming app's `scope:<project>` constraint already lists `"scope:shared"`
     in its `onlyDependOnLibsWithTags` — these exist once `libs/mcp-tool-result` has
     landed, so normally nothing to add here, just verify.
   - Confirm the `type:app` constraint's `onlyDependOnLibsWithTags` includes
     `"type:lib"` (not just `"type:app"`) — every project here is tagged both
     `type:app` and `type:mcp-server` simultaneously, and `@nx/enforce-module-boundaries`
     requires **every** matching constraint to pass, so `type:mcp-server`'s constraint
     already allowing `type:lib` isn't sufficient on its own. This bit exactly once
     already; it should already be fixed workspace-wide, but if `nx run <app>:lint`
     reports `"A project tagged with type:app can only depend on libs tagged with
type:app"`, this is why.
   - Confirm `@nx/dependency-checks` is configured in two separate blocks — one for
     `libs/*/package.json` (plain check) and one for `apps/*/package.json` (which adds
     `includeTransitiveDependencies: true` and `ignoredDependencies` listing the `libs/*`
     packages). Both set `buildTargets: ["typecheck"]`, not the rule's default
     `["build"]` — libs here have no `build` target, and the rule only counts a
     dependency as "used" if the _dependency_ project also has the named target. This
     should already be set workspace-wide; don't revert it.
6. **In each consuming app**, add `"@ckaznocha/<name>": "workspace:*"` to its
   `package.json` **`devDependencies`** (not `dependencies`), then
   `import { ... } from "@ckaznocha/<name>"` (bare specifier, not a relative path) in the
   source file that needs it. `devDependencies` is specifically for `libs/*` packages, not
   a general rule — ordinary npm dependencies still go in `dependencies`. `libs/*` are
   `private: true`, so `pnpm publish` rewrites `workspace:*` to a version npm cannot
   resolve and `npm i` of the published app fails outright; they're instead inlined into
   the app's bundle, making `devDependencies` accurate (build-time input only). Two more
   edits are needed for that inlining to work — see CLAUDE.md's "How a `publish:npm` app
   is packaged":
   - Add the lib to `excludeFromExternal` in **each consuming app's** `project.json`
     `build` target, or esbuild leaves it as an unresolvable bare import in `dist/main.js`.
   - Add the lib to `ignoredDependencies` in `eslint.config.ts`'s `apps/*/package.json`
     block, or `@nx/dependency-checks` moves it back into `dependencies`.
   - If the new lib has its own runtime `dependencies`, every consuming app must declare
     them too (they're inlined with the lib, so they're real runtime deps of the app).
     `includeTransitiveDependencies: true` makes lint catch this for you; run
     `pnpm nx lint <app> --fix` and then widen the pinned version it writes to match the
     range the lib declares.
7. **`pnpm install`** to link the new workspace package (needed after step 2 and again
   after step 6).
8. **Verify, in this order** — each catches a different class of the errors above:
   `pnpm nx run-many -t typecheck,test,lint,build -p <name>,<consuming-app-1>,...`,
   then `pnpm run lint:workspace` (sherif), then `pnpm run format:check`. Run
   `npx nx reset` first if a target result looks stale (module-boundary and
   dependency-checks errors are graph-cached and can lag a package.json edit).

## Removing a lib

If a lib turns out to be the wrong call (see the litmus test above — this happened to
`libs/tmdb-client`), reverting it means undoing every step above: delete the
`libs/<name>` directory, remove it from root `tsconfig.json` `references`, remove the
`workspace:*` dependency and import from every consumer's `package.json`/source, and
restore whatever project-local file the logic came from (check git history for the
pre-extraction version rather than rewriting from scratch). Leave the
`pnpm-workspace.yaml` `libs/*` glob and the `eslint.config.ts` boundary/dependency-checks
config in place if any other lib still exists — those are workspace-wide fixtures, not
per-lib.
