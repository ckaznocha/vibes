#!/usr/bin/env bash
# PreToolUse hook (Edit|Write): ask before editing GitHub Actions workflows —
# they pin step-security/harden-runner SHAs and set permissions: read-all.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.github/workflows/*.yml|*.github/workflows/*.yaml) ;;
  *) exit 0 ;;
esac

reason="Editing a GitHub Actions workflow: double-check pinned action SHAs (step-security/harden-runner) and the permissions: read-all default are not being loosened."
jq -n --arg reason "$reason" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $reason}}'
exit 0
