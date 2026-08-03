---
name: cut-release
description: Cut a release for any project tagged publish:npm in this workspace. Use when the user asks to release, publish, cut a version, or bump the version of an app.
disable-model-invocation: true
---

# Cut a release

Any project tagged `publish:npm` publishes to npm independently, straight from this
monorepo — there's no separate mirror repo involved (`repository.url` in `package.json`
is just metadata). Publishing is driven entirely by a GitHub Release whose tag matches
`<project>@v<version>` (see `.github/workflows/release.yml`); creating that release
triggers CI to lint, typecheck, test, build, and `pnpm publish` the one project whose
prefix matched. This is generic across every `publish:npm`-tagged project — a new one
gets this workflow for free by carrying the tag; no root-level change needed here.

## Steps

1. **Find the target project** if not already named: `nx show projects -p "tag:publish:npm" --json`.
   Confirm the npm package name matches the project name:
   `nx show project <project> --json | jq -r '.metadata.js.packageName'`.
2. Decide the new version (semver) and update it in `<project-root>/package.json`
   (get the root via `nx show project <project> --json | jq -r '.root'`). That's the only
   file that needs the version bump — the monorepo root `package.json` stays at `0.0.0`.
   Optionally, use `nx release version -p <project> --dry-run` first to see what
   `conventionalCommits` would compute from commit history since the last matching
   `<project>@v*` tag — it won't write anything (nx.json disables its git commit/tag), so
   still hand-edit `package.json` to apply the number it suggests.
3. Run the full local check before tagging, exactly as CI will:
   `nx run <project>:lint,typecheck,test,build`.
4. Commit the version bump: `git commit -m "<project>: bump to vX.Y.Z"`.
5. Tag and push: `git tag <project>@vX.Y.Z && git push origin <project>@vX.Y.Z`.
6. Create the GitHub Release from that tag: `gh release create <project>@vX.Y.Z --generate-notes`.
   `release.yml` parses the project name back out of the tag (everything before `@v`) and
   fails the run if it isn't tagged `publish:npm` — get the `<project>@v` prefix exactly
   right or the publish job errors out.
7. Watch the `publish` job in Actions; it needs `secrets.NPM_TOKEN` to succeed.

## Guardrails

- Never hand-run `pnpm publish` locally — provenance (`--provenance`) only works from the
  GitHub Actions OIDC context in CI, and doing it locally bypasses the lint/test/build gate
  CI enforces.
- Double-check you bumped the right project's `package.json` — a `<project>@vX.Y.Z` tag
  with a _different_ project's version bumped will publish the wrong package version.
- A newly `publish:npm`-tagged project needs no CI change: `release.yml`'s single generic
  `publish` job resolves the project from the release tag and validates it against
  `nx show projects -p "tag:publish:npm"`. The tag genuinely is the wiring — but that also
  means a typo'd tag or a missing `publish:npm` tag fails the run outright rather than
  silently skipping it.

Use the `release-gatekeeper` agent before step 4 to double-check readiness.
