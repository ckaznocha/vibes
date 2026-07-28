#!/usr/bin/env bash
# SessionStart hook: summarize what nx considers affected vs. origin/main,
# so Claude (and you) know what's dirty before touching anything.
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

base=""
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  base="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  base="main"
else
  exit 0
fi

projects=$(pnpm exec nx show projects --affected --base="$base" 2>/dev/null || true)
if [ -z "$projects" ]; then
  exit 0
fi

summary="Affected Nx projects vs $base: $(printf '%s' "$projects" | tr '\n' ' ')"
jq -n --arg ctx "$summary" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
exit 0
