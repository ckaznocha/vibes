---
name: dep-audit
description: Audit workspace dependencies (npm packages, mise-managed tools, and GitHub Actions pins) for known vulnerabilities and staleness before a release or periodically. Use when asked to check dependencies, audit for CVEs, or before running the cut-release skill.
---

# Dependency audit

CI already gates on `osv-scanner.yml` and `dependency-review.yml` for every PR, and
`dependabot.yml` keeps npm packages, GitHub Actions, and the devcontainer image current
automatically — this skill covers what those don't: a pre-push local check for npm, plus
`mise.toml`-managed tools (`node`, `lefthook`, `actionlint`, `corepack`), which have **no**
Dependabot ecosystem at all (verified against GitHub's supported-ecosystems list — there
is no `mise`/`asdf`/tool-version-file support). `mise-outdated.yml` covers that gap in CI
on a schedule; this skill covers it on demand.

## Steps

1. **Outdated npm packages**: `pnpm outdated -r` — review majors especially; this
   workspace pins `typescript` to `~6.0.3` deliberately (see
   `docs/superpowers/specs/2026-07-26-vibes-monorepo-design.md` for why), so don't bump it
   as part of a routine audit without checking that decision first.
2. **Known npm vulnerabilities**: `osv-scanner scan -r .` (matches what CI's
   `osv-scanner.yml` runs against the lockfile).
3. **Outdated mise-managed tools**: `mise outdated --bump --json` — `--bump` is required
   even though every tool in `mise.toml` is exact-pinned; without it `mise outdated` only
   compares against a version _range_, and an exact pin has no range to be behind on, so
   it silently reports nothing even when a newer version exists (this is how `lefthook`
   drifted 6 patch versions unnoticed before). Filter to this repo's own `mise.toml` via
   `source.path`, ignoring anything from `~/.config/mise/config.toml` (global user tools,
   not part of this repo):
   `mise outdated --bump --json | jq --arg path "$(pwd)/mise.toml" 'with_entries(select(.value.source.path == $path))'`
   (`mise-outdated.yml` runs this same filter on a weekly schedule and files/updates a
   tracking issue — this step is for checking between scheduled runs.)
   Node is deliberately pinned to the 24.x LTS line — `mise outdated --bump` will always
   show a newer major (currently 26.x) as "available"; that's not staleness, don't bump it
   without a deliberate LTS-migration decision, same posture as the `typescript` pin above.
4. **GitHub Actions pins**: normally Dependabot handles this automatically (daily), so
   this step is a spot-check, not routine maintenance. To verify a specific pinned SHA is
   still what its version comment claims (integrity, not just staleness):
   `gh api repos/<owner>/<repo>/git/refs/tags/<tag> -q '.object.sha'` and compare to the
   SHA in the workflow file — use `git/refs/tags`, not `commits/<tag>`, since many actions
   use annotated tags where those two endpoints deliberately return different SHAs (the
   tag object vs. the commit it wraps); comparing against the wrong one produces false
   mismatches.
5. **New/changed deps since last release**: `git diff origin/main -- pnpm-lock.yaml
'**/package.json'` to see exactly what's new before tagging a release with
   `cut-release`, regardless of which directory the changed project lives in.

## Triage

- A finding in a `devDependency` (eslint plugins, `@types/*`, build tooling) is lower
  urgency than one in a runtime `dependency` of a `publish:npm`-tagged project — those ship
  in the published package. It's higher urgency still if that project is also tagged
  `data-source:scraping`, since the dependency runs against untrusted third-party HTML/JSON
  (check `<project-root>/package.json`'s `dependencies` for the current list).
- If `osv-scanner` flags something with no fix available yet, don't silently ignore it —
  note it in the release notes or a tracking issue, since `dependency-review.yml` will
  flag the same thing on the next PR that touches the lockfile. Check whether the finding
  is even reachable first: a vulnerable transitive dependency of `nx` or
  `@modelcontextprotocol/sdk` that's already at its own latest release isn't something a
  bump on our end can fix — note that distinction rather than treating every finding as
  equally actionable.
