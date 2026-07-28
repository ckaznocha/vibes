# Security Policy

## Supported versions

Everything in this repo is pre-1.0 (`0.x`) and, as of writing, not yet
published to npm. Only the latest commit on `main` and the latest published
version of each package (once released) are supported — there are no LTS
branches and no back-patching of older releases.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a security report. Use this
repository's
[Security Advisories](https://github.com/ckaznocha/vibes/security/advisories/new)
tab ("Report a vulnerability") instead — everything here is a single
monorepo, so file against `vibes` regardless of which app or lib is
affected. Include:

- Which project (`apps/<name>` or `libs/<name>`) and, if applicable, which
  tool or exported function
- Steps to reproduce, or a minimal proof of concept
- What you'd expect to happen instead

Expect an initial response within 5 business days. Please allow a
reasonable window to land and release a fix before any public disclosure.

## Scope notes specific to this workspace

- `alamo-mcp` is `safety:link-only`: it must never submit an Alamo
  Drafthouse booking or reservation, only return a deep link. A report that
  it (or any future tool) performs a state-changing action against a
  third-party service is a valid, high-priority security report.
- `alamo-mcp` and `letterboxd-mcp` are `data-source:scraping`: they parse
  uncontracted third-party HTML/JSON. Reports about unsafe parsing (e.g. an
  injection vector from untrusted scraped content) are in scope; reports
  that a target site changed its markup and broke scraping are a bug, not a
  security issue — open a regular GitHub issue for those instead.
- These are stdio MCP servers, not network services — there's no exposed
  port or endpoint to probe. The relevant trust boundary is the local MCP
  client process invoking each server and the third-party APIs each server
  calls out to.
