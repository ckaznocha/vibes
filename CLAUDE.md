<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Workspace conventions (this section is NOT nx-managed — edit freely, do not delete)

This is a generic harness meant to keep growing with new, independently-published
projects. The root-level tooling (`.claude/skills`, `.claude/agents`, `.claude/hooks`)
is written to discover projects via **Nx tags and the project graph**, not by hardcoding
project names — a new project gets skills, agents, hooks, and lint/module-boundary rules
"for free" by carrying the right tags, with zero changes needed to root-level `.claude/`
content. Keep it that way: when you add root-level automation, make it query
`nx show projects -p "tag:..."` / `nx show project <p> --json` rather than naming a
specific project.

## How a `publish:npm` app is packaged

**Only `libs/*` code is bundled into the app; npm packages stay external and declared.**
Each publishable app's esbuild `build` target sets
`excludeFromExternal: ["@ckaznocha/mcp-tool-result", "@ckaznocha/resilient-fetch"]`, which
inlines just those private workspace packages into `dist/main.js` (8–19KB) and leaves
every real npm dependency to be resolved normally at runtime.

This split exists for one reason: **`libs/*` packages are `private: true` and can never
appear in a published app's `dependencies`.** `pnpm publish` rewrites `workspace:*` to a
concrete version, npm 404s resolving it, and `npm i` fails before any code runs. Inlining
them makes the problem disappear rather than papering over it. They stay in
`devDependencies`, which is accurate — after bundling they are build-time inputs only.

Everything else belongs in `dependencies` as usual, **including the transitive deps of the
inlined libs**: `cockatiel` and `p-queue` arrive via `libs/resilient-fetch`, so each app
that inlines it declares them directly. That looks redundant until you remember the
alternative — those two being neither bundled nor declared is precisely what shipped a
`dist/main.js` that threw `ERR_MODULE_NOT_FOUND` on startup.

`@nx/dependency-checks` enforces this, in two blocks in `eslint.config.ts`:
`libs/*/package.json` gets the plain check; `apps/*/package.json` adds
`includeTransitiveDependencies: true` (so a lib gaining a dependency becomes a lint error
in every consuming app, not a runtime crash) plus `ignoredDependencies` naming the two
`libs/*` packages (so the rule never moves them into `dependencies`). Keep both — dropping
either one re-opens a bug that already shipped once. `nx lint` autofixes a missing
transitive dep, but pins the exact installed version; match the range the lib itself
declares instead.

Resist "simplifying" this to `thirdParty: true` (inline everything, empty `dependencies`).
It was tried and reverted: it produces a package whose manifest discloses none of the ~30
third-party packages actually inside the tarball, which breaks SBOM/attribution, and it
drags in esbuild's dynamic-`require` problem — `letterboxd-mcp` died at import with
`Dynamic require of "buffer" is not supported` (safer-buffer ← iconv-lite ← cheerio),
needing a `createRequire` banner as a workaround. Keeping npm packages external avoids
both. The one thing it bought — a ~25MB-smaller install — is not worth an unauditable
artifact.

One esbuild detail to preserve: `target: "node24"` matches each app's `engines.node`.
Without an explicit target esbuild assumes `esnext`, and its handling of things like the
`node:` import prefix is target-dependent.

Before cutting any release, verify the packaging end-to-end rather than trusting the
build: `pnpm pack` the app, then `npm install ./<tarball>` in an empty directory outside
the workspace and actually run the installed binary — and check that no `@ckaznocha/*`
package other than the app itself landed in `node_modules`. `nx build` succeeding says
nothing about whether the published package resolves or even starts: this exact gap once
shipped three apps whose `dist/main.js` externalized `cockatiel`/`p-queue` and whose
manifests depended on unpublishable workspace packages, and `nx build` was equally happy
to emit a `letterboxd-mcp` bundle that threw on its first import.

There is deliberately **no `prune`/`prune-lockfile`/`copy-workspace-modules` target**.
Those belong to Nx's container-deploy flow (ship `dist` + a pruned lockfile + install at
the destination), which contradicts bundling: they were emitting a 964-line lockfile of
packages already inlined in the bundle, plus an empty `workspace_modules/` the lockfile
still referenced. Nothing consumed them. If a container deploy is ever wanted, reach for
`generatePackageJson` and publish from `dist` instead — but note that Nx rewrites `main`
to `./main.js` there while leaving `bin` pointing at `dist/main.js`, so `bin` needs
fixing by hand if you go that route.

## Tag taxonomy

Declared in each project's `project.json` `tags` array. `npm:*` tags and
`metadata.description` are free — Nx infers them from `package.json` `keywords`/
`description`, don't set them by hand.

| Tag                     | Means                                                                                                                    | Who reads it                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope:<project>`       | Standard Nx per-project isolation tag                                                                                    | `@nx/enforce-module-boundaries` in `eslint.config.ts`                                                                                                                            |
| `scope:shared`          | Lib in `libs/*` meant to be depended on by more than one app (not owned by any single `scope:<project>`)                 | `@nx/enforce-module-boundaries`; every `scope:<project>` app is permitted to depend on `scope:shared` libs, and `scope:shared` libs may only depend on other `scope:shared` libs |
| `type:app` / `type:lib` | Deployable unit vs. shared library                                                                                       | `@nx/enforce-module-boundaries`                                                                                                                                                  |
| `type:mcp-server`       | Project is a stdio MCP server (`@modelcontextprotocol/sdk` + `zod`, `main.ts` wiring + `registerTool` per file)          | `project-conventions`, `new-mcp-tool`, `security-reviewer`                                                                                                                       |
| `publish:npm`           | Project publishes to npm via a `<project>@vX.Y.Z`-tagged GitHub Release (see `.github/workflows/release.yml`)            | `cut-release`, `release-gatekeeper`, `dependency-reviewer`                                                                                                                       |
| `data-source:scraping`  | Project parses uncontracted third-party HTML/JSON and should declare its live sources in a `<root>/fixture-sources.json` | `project-conventions`, `regen-fixture`, `scrape-resilience-reviewer`                                                                                                             |
| `safety:link-only`      | Project must never perform the state-changing action it links to (only returns a URL)                                    | `project-conventions`, `security-reviewer`                                                                                                                                       |

## Adding a new project

1. Tag it appropriately in `project.json` (table above) — this is what makes it
   discoverable, not a name added to some root config file.
2. If it's `type:mcp-server`, follow `project-conventions` (auto-loads when you touch its
   `src/`) and use `new-mcp-tool` to add tools.
3. If it's `publish:npm`, nothing needs adding to `.github/workflows/release.yml` — it has
   a single generic `publish` job that parses `<project>@v<version>` out of the release tag
   and validates the project against `nx show projects -p "tag:publish:npm"`, so the tag
   alone is what wires up CI. (This item used to say a hand-written `publish-<project>` job
   was required; that stopped being true when `release.yml` was refactored to be
   tag-driven.)
4. If it's `data-source:scraping`, add a `fixture-sources.json` at its root so
   `regen-fixture` can check it for upstream drift.
5. If it introduces a genuinely new category of thing (not just another instance of an
   existing tag), extend the taxonomy table above and, if it constrains dependencies,
   `eslint.config.ts`'s `depConstraints` — don't invent an untagged, undocumented
   convention.
6. The `@nx/js/typescript` sync generator (registered in `nx.json`) is supposed to keep
   root `tsconfig.json`'s `references` array up to date from the project graph, but every
   project in this workspace (apps and libs alike) overrides its inferred `build`/
   `typecheck` targets with hand-written `nx:run-commands` ones in `project.json` — the
   sync generator doesn't engage for a project once its targets are hand-written, so in
   practice it has never auto-updated this file. Add the new project's `{ "path":
"./apps/<name>" }` / `{ "path": "./libs/<name>" }` entry to root `tsconfig.json`
   `references` by hand; don't rely on `nx build`/`nx typecheck` to prompt for it.
7. `eslint.config.ts`'s typed-linting `parserOptions.project` glob already covers both
   `apps/*/tsconfig.spec.json` and `libs/*/tsconfig.spec.json` — a project under either
   directory gets typed linting for free; a project in some third top-level directory
   would need that glob extended.
8. `pnpm-workspace.yaml` declares `libs/*` (added once the first lib — `libs/mcp-tool-result`
   — landed; `sherif`, see `pnpm run lint:workspace`, would otherwise flag a workspace glob
   matching zero packages as a smell). A `libs/<name>` package needs a `main`/`types` and
   `exports` field in its `package.json` pointing at `./src/index.ts` — these are
   TS-source-only libs with no build step (consuming apps' esbuild `bundle: true` builds
   read the source directly), so nothing else resolves the bare `import from "<lib-name>"`
   specifier otherwise. A lib meant to be shared across more than one app's `scope:<project>`
   gets tagged `scope:shared` (see taxonomy above) instead of a single app's scope tag. Use
   the `new-lib` skill to scaffold one — it encodes every gotcha in this item plus the two
   below, all discovered the hard way once already:
   - `eslint.config.ts`'s `type:app` `depConstraints` entry must list `type:lib` in its
     `onlyDependOnLibsWithTags`, not just `type:app` — every project here is tagged both
     `type:app` and `type:mcp-server` simultaneously, and `@nx/enforce-module-boundaries`
     requires _every_ matching constraint to pass, so the `type:mcp-server` constraint
     already allowing `type:lib` isn't enough on its own.
   - `@nx/dependency-checks` (wired in `eslint.config.ts` for `apps/*/package.json` and
     `libs/*/package.json`) is configured with `buildTargets: ["typecheck"]` instead of its
     default `["build"]`, because it only counts a workspace dependency as "used" if that
     _dependency_ also has the named target — and libs here intentionally have no `build`
     target. Don't "fix" this back to the default; every project (apps included) has
     `typecheck`, so that's the one target guaranteed to exist everywhere.
9. `lefthook.yml`'s `affected-checks` command already runs `nx affected -t typecheck,test`
   scoped to whatever you staged — nothing to add there for a new project either.
10. `.vscode/launch.json` is the one thing here Nx/pnpm can't make automatic: VS Code debug
    configs are inherently per-project (no glob support), so a new project that needs one
    still needs a hand-added entry, following the existing `Debug <project> with Nx`
    pattern (own inspector port, own `outFiles` path).
11. **Before writing new logic in any `type:mcp-server` project — new or existing — check
    whether it already exists elsewhere first.** Grep sibling `type:mcp-server` projects'
    `src/` (`nx show projects -p "tag:type:mcp-server" --json`, then read each match) and
    `libs/*` for a function doing the same thing. If it's genuinely the same concern in two
    or more projects (not just superficially similar — see the litmus test below), extract
    it into a `scope:shared` lib via the `new-lib` skill instead of writing a second copy,
    the same way `libs/mcp-tool-result` and `libs/resilient-fetch` (retry/circuit-breaking/
    throttling for outbound network calls — see `project-conventions`'s "Network calls"
    section) got pulled out, and `libs/tmdb-client` (later reverted — see next paragraph)
    did not. This applies equally when scaffolding a brand-new project: check what the
    existing `type:mcp-server` projects already have before hand-rolling something they've
    already solved (tool-result wrapping, env-var parsing helpers, network retry/throttling,
    an API client with request caching, etc).
    - **Litmus test — extract only if the _concern_ is shared, not just the shape.** Two
      functions with a similar signature that happen to solve different problems don't
      belong in one lib. `libs/tmdb-client` looked identical to `libs/mcp-tool-result` in
      spirit (both were "cache an instance/format a response, used in ≥2 projects") but got
      reverted: `tmdb-mcp` was created specifically to be the _only_ place TMDB logic lives
      in this workspace, so `letterboxd-mcp` depending on a shared TMDB client re-created
      the exact coupling that project split was meant to remove. `libs/mcp-tool-result`
      survived the same review because MCP response formatting isn't "owned" by any one
      project — it's incidental plumbing every `type:mcp-server` project needs alike. When
      unsure which case you're in, ask: does one project exist specifically so others don't
      have to implement this? If yes, don't extract — make the other project(s) call it
      instead (even if that means a second tool-call round trip), or ask the user first.
12. Every project's `package.json` `name` is scoped `@ckaznocha/<project>` (the Nx project
    name itself — `project.json` `name`, tags, `nx run <project>:...` — stays unscoped;
    only the npm-facing `package.json` name carries the prefix), and every project's
    `package.json` gets `"license": "MIT"`. This is enforced at the root, not per-project:
    root `package.json`'s own `name` is `@ckaznocha/vibes`, and Nx infers the org prefix
    for anything scaffolded with an `@nx/*` generator (e.g. `@nx/js:lib`) from that root
    `name` field, so a fresh generator-created project is prefixed automatically. Projects
    scaffolded by hand (this workspace's `type:mcp-server` apps and `libs/*` don't go
    through a generator — see `new-lib`/`project-conventions`) need the prefix and license
    added by hand in their `package.json`, and any `workspace:*` dependency reference or
    bare-specifier import of a `libs/*` package elsewhere in the workspace must use the
    scoped name (`import { ... } from "@ckaznocha/mcp-tool-result"`, not
    `"mcp-tool-result"`) — `new-lib`'s template already reflects this.

`nx.json`'s `release` block is configured for independent per-project versioning
(`conventionalCommits`, `releaseTag.pattern: "{projectName}@v{version}"` matching the tag
format `release.yml` already parses) and changelog generation, but `version.git`/
`changelog.git` are both disabled — `nx release version`/`nx release changelog` are
available as optional local helpers (e.g. to auto-compute the next semver bump or draft a
CHANGELOG.md entry), but they do not commit, tag, or push. The actual commit/tag/publish
trigger stays exactly as `cut-release` describes: a manually created GitHub Release whose
tag CI parses. Future direction worth considering as this grows: flipping `version.git.tag`
and wiring `nx release publish` into CI so tagging and publishing become fully automated
instead of the current manual `cut-release` steps — not done yet since it touches
CI/release infra and wasn't asked for.

Nx Cloud is connected (`nx.json`'s `nxCloudId`) for remote caching and self-healing CI
(`.github/workflows/ci.yml` runs `npx nx-cloud fix-ci` after the main task run).
Distributed task execution via Nx Agents (`nx-cloud start-ci-run --distribute-on=...`) **is**
set up — `.github/workflows/ci.yml`'s `affected` job distributes `build,lint,test,typecheck`
across 3 `linux-medium-js` agents (defined in `.nx/workflows/agents.yaml`), specifically to get
[flaky task detection/auto-rerun](https://nx.dev/docs/features/ci-features/flaky-tasks), which
requires Nx Agents. `format:check` and `lint:workspace` (non-Nx commands) stay on the
coordinator, wrapped in `nx-cloud record --` for CI visibility. This was added despite the
workspace's small project count purely for flaky-test handling, not because task volume
justified it — if agent cost/latency stops being worth it for that alone, revert to the plain
`nx affected` coordinator-only job instead of scaling agent count.
