# gen-readme-table

Internal dev tool (not published) that regenerates the project table in the
root `README.md` between the `<!-- projects:table:start -->` /
`<!-- projects:table:end -->` markers, sourced from each project's Nx
metadata (`nx show project <name>`, tags, and `package.json` description).

## Usage

```sh
pnpm run docs:table
```

Runs automatically on pre-commit via `lefthook.yml`'s `readme-table` hook
whenever an `apps/*` or `libs/*` project's `project.json`/`package.json`
changes.

## Development

```sh
pnpm exec nx test gen-readme-table
pnpm exec nx typecheck gen-readme-table
pnpm exec nx run gen-readme-table:run
```

No build target — this is a TS-source-only app, run directly via Node's
native TypeScript support (`node src/main.ts`).
