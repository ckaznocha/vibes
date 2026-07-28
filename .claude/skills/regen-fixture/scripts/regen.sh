#!/usr/bin/env bash
# Fetch a live third-party source for a data-source:scraping project and diff it against
# its declared fixture, to detect upstream markup/schema drift.
#
# Source projects are discovered via the nx tag `data-source:scraping`. Each such project
# declares its sources in a `fixture-sources.json` file at its project root (see
# apps/*/fixture-sources.json for the existing examples) — this script has no per-project
# knowledge baked in, so a new scraping project gets this tooling for free by adding the
# tag + file.
#
# Usage:
#   regen.sh <project> <arg>              # if the project has exactly one source
#   regen.sh <project> <source-name> <arg>
#   regen.sh                              # list eligible projects
set -euo pipefail

nx() { pnpm exec nx "$@"; }

project="${1:-}"
if [ -z "$project" ]; then
  echo "Projects tagged data-source:scraping:"
  nx show projects -p "tag:data-source:scraping" --json | jq -r '.[]'
  exit 0
fi

project_json=$(nx show project "$project" --json 2>/dev/null) || {
  echo "Unknown project: $project" >&2
  exit 1
}
root=$(printf '%s' "$project_json" | jq -r '.root // empty')
if [ -z "$root" ]; then
  echo "Unknown project: $project" >&2
  exit 1
fi

sources_file="$root/fixture-sources.json"
if [ ! -f "$sources_file" ]; then
  echo "$project has no fixture-sources.json at $sources_file — nothing to check." >&2
  echo "(Is it actually tagged data-source:scraping? nx show project $project --json | jq .tags)" >&2
  exit 1
fi

source_count=$(jq '.sources | length' "$sources_file")
if [ "$source_count" -eq 1 ]; then
  source_name=$(jq -r '.sources[0].name' "$sources_file")
  arg="${2:?usage: regen.sh $project <arg> ($(jq -r '.sources[0].argHint' "$sources_file"))}"
else
  source_name="${2:?usage: regen.sh $project <source-name> <arg> — sources: $(jq -r '.sources[].name' "$sources_file" | tr '\n' ' ')}"
  arg="${3:?usage: regen.sh $project $source_name <arg>}"
fi

source_def=$(jq --arg name "$source_name" '.sources[] | select(.name == $name)' "$sources_file")
if [ -z "$source_def" ]; then
  echo "No source named '$source_name' in $sources_file" >&2
  exit 1
fi

url_template=$(printf '%s' "$source_def" | jq -r '.url')
url=${url_template//\{arg\}/$arg}
fixture_rel=$(printf '%s' "$source_def" | jq -r '.fixture')
fixture="$root/$fixture_rel"

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

curl_args=(-fsSL)
while IFS=$'\t' read -r key value; do
  [ -z "$key" ] && continue
  curl_args+=(-H "$key: $value")
done < <(printf '%s' "$source_def" | jq -r '.headers // {} | to_entries[] | [.key, .value] | @tsv')

curl "${curl_args[@]}" "$url" -o "$tmp"

echo "Fetched $(wc -c < "$tmp") bytes from live $project/$source_name source."
echo "Diffing against $fixture (structural diff only — real data changes daily,"
echo "so look for SHAPE changes: new/missing HTML classes or JSON keys, not content):"
echo
diff -u "$fixture" "$tmp" || true
echo
echo "If this reveals a real shape change (not just today's data), overwrite:"
echo "  cp \"$tmp\" \"$fixture\""
echo "then run: nx test $project"
echo "and update parsing code + a *-malformed fixture if the change affects failure handling."
