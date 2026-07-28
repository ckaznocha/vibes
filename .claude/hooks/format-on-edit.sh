#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): eslint --fix + prettier --write the edited .ts file.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts) ;;
  *) exit 0 ;;
esac

pnpm exec eslint --fix "$file" 2>/dev/null || true
pnpm exec prettier --write "$file" 2>/dev/null || true
exit 0
