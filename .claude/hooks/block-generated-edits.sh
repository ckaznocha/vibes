#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): block edits to build output and the lockfile.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
base=$(basename "$file")

reason=""
case "$file" in
  */dist/*) reason="dist/ is build output — edit the source in src/ and rebuild instead." ;;
esac
if [ -z "$reason" ] && [ "$base" = "pnpm-lock.yaml" ]; then
  reason="pnpm-lock.yaml is generated — run pnpm install to update it instead of editing it directly."
fi

if [ -n "$reason" ]; then
  jq -n --arg reason "$reason" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
fi
exit 0
