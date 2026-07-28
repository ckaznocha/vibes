---
name: regen-fixture
description: Check whether any data-source:scraping project's live third-party source has drifted from its test fixtures. Use when a scrape/parse test starts failing against live data, or periodically to catch upstream format drift before it does.
disable-model-invocation: true
---

# Check for upstream format drift

Any project tagged `data-source:scraping` parses uncontracted third-party HTML/JSON.
This skill fetches a live sample and diffs it against the fixture used in tests, so you
can tell "the data changed today" apart from "the shape of the data changed" before a
parse failure surprises you in production.

Sources are discovered generically, not hardcoded in this skill: each `data-source:scraping`
project declares its own fetchable sources in a `fixture-sources.json` file at its project
root (see `apps/letterboxd-mcp/fixture-sources.json` and `apps/alamo-mcp/fixture-sources.json`
for the current examples). A new scraping project gets this tooling automatically the
moment it adds the tag and that file — no change to this skill or its script required.

## Usage

```
bash scripts/regen.sh                          # list projects tagged data-source:scraping
bash scripts/regen.sh <project> <arg>           # if the project has exactly one source
bash scripts/regen.sh <project> <source-name> <arg>
```

`<arg>` is whatever that source's `argHint` says (a username, a market slug, etc. — the
script prints the hint if you omit it). This makes a **live network request** to a
third-party site — only run it when you actually need to check for drift, not as part of
routine testing (`node --test` already covers the fixture-based cases; see
[[project-conventions]]).

## Reading the diff

- Content differences (different films in a watchlist, different showtimes) are expected
  and not a problem — the underlying data changes constantly.
- **Shape** differences are the signal: a renamed/removed HTML class the scraper selects
  on, a restructured JSON key path, a field that's now missing or newly present.

## If you find a real shape change

1. Overwrite the fixture: `cp <tmpfile> <project-root>/<fixture-path>` (the script prints
   the exact command using the path from that project's `fixture-sources.json`).
2. Run `nx run <project>:test` — see which parser assumptions now fail.
3. Fix the parsing code to handle the new shape. If the old shape might still appear
   (rollout, A/B test), keep it fail-closed per [[project-conventions]] rather than
   assuming the new shape is now permanent.
4. If the failure mode changed, add/update a matching `*-malformed*` fixture so the
   regression is covered going forward, not just fixed once.

## Adding a new source to an existing project, or a new scraping project

Add (or extend) `<project-root>/fixture-sources.json`:

```json
{
  "sources": [
    {
      "name": "source-name",
      "url": "https://example.com/{arg}/path",
      "fixture": "src/fixtures/normal-response.json",
      "headers": { "User-Agent": "..." },
      "argHint": "what the caller should pass as <arg>"
    }
  ]
}
```

`headers` is optional. `{arg}` in `url` is substituted with whatever's passed on the
command line. If the project isn't tagged `data-source:scraping` yet, add that tag to its
`project.json` too — that's what makes it show up in `regen.sh`'s no-args project listing.
