# Contributing

Enhancements or fixes are welcome.

## Issues

Check if a ticket for your issue already exists in GitHub issues. If you don't
find a ticket submit a new one.

## Setup

Requires Node >=24 and [pnpm](https://pnpm.io) (see `packageManager` in the
root `package.json`; [mise](https://mise.jdx.dev) will pick up the pinned
versions automatically if you use it).

```sh
pnpm install
```

This also installs [lefthook](https://github.com/evilmartians/lefthook) git
hooks, which run formatting, linting, and affected tests on every commit —
your commit will fail before CI does if something's off.

## Pull Requests

1. Fork the repo.
1. Make your changes. If you touched a `project.json`/`package.json`
   description, run `pnpm run docs:table` to refresh the root README's
   project table (the pre-commit hook does this for you automatically too).
1. Commit and push to your fork.
   1. Extra credit if you squash your commits first.
1. Submit a pull request.

### Style

- Your code should pass `pnpm exec nx run-many -t lint,typecheck` and
  `pnpm run format:check`.
- Follow the existing conventions — each project's own `README.md` documents
  its config and tools, and `CLAUDE.md`/`AGENTS.md` document workspace-wide
  conventions (tag taxonomy, module boundaries, adding a new project).

### Tests

- If you add any functionality be sure to also add a test for it:
  `pnpm exec nx test <project>` or `pnpm exec nx affected -t test`.
- All regressions need to pass before your pull can be accepted.

## License

By contributing to vibes you agree that your contributions will be
licensed under its MIT license.
