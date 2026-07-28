#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): run the affected project's nx test after editing a .ts
# file, using Nx's own file->project graph (works for any project, any directory layout —
# not hardcoded to apps/*). Feeds a failure back to the model via decision:block.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac
# nx --files wants a path relative to the workspace root; hooks receive absolute paths.
relfile="${file#"$PWD"/}"

projects=$(pnpm exec nx show projects --affected --files="$relfile" --withTarget test --json 2>/dev/null || echo '[]')
count=$(printf '%s' "$projects" | jq 'length')
[ "$count" -eq 0 ] && exit 0

for project in $(printf '%s' "$projects" | jq -r '.[]'); do
  if ! output=$(pnpm exec nx test "$project" 2>&1); then
    clean=$(printf '%s' "$output" | sed -E 's/\x1b\[[0-9;]*m//g')
    jq -n --arg project "$project" --arg out "$clean" \
      '{decision: "block", reason: ("nx test " + $project + " failed after this edit:\n\n" + $out)}'
    exit 0
  fi
done
exit 0
