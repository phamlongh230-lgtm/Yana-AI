#!/usr/bin/env bash
# Recompute hashes for every skill listed in skills-lock.json and write them back.
# Use this after intentionally updating a skill (e.g. pulling the latest from
# upstream). The verify script will then succeed again.
#
# This does NOT add new skills to the lockfile — edit skills-lock.json manually
# first to add a new entry with the correct localPath, then run this script.

set -uo pipefail

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Support multiple layout conventions (repo scaffold vs unzipped into .claude/)
LOCKFILE=""
for candidate in \
  "$PROJECT_ROOT/skills-lock.json" \
  "$PROJECT_ROOT/core/config/skills-lock.json" \
  "$PROJECT_ROOT/config/skills-lock.json"; do
  if [[ -f "$candidate" ]]; then
    LOCKFILE="$candidate"
    break
  fi
done

if ! command -v jq >/dev/null 2>&1; then
  echo "✗ update-skills-lock: jq is required but not installed." >&2
  exit 2
fi

if [[ -z "$LOCKFILE" ]]; then
  echo "✗ update-skills-lock: skills-lock.json not found in expected locations" >&2
  exit 2
fi

# Build a jq filter that patches each skill's computedHash.
tmpfile=$(mktemp)
cp "$LOCKFILE" "$tmpfile"

updated=0
while IFS=$'\t' read -r name local_path; do
  full_path="$PROJECT_ROOT/$local_path"

  if [[ ! -d "$full_path" ]]; then
    echo "✗ SKIP     $name  (missing at $local_path — fix manually)"
    continue
  fi

  actual_hash=$(
    cd "$full_path" && \
    find . -type f -not -name "mcp.json" -exec sha256sum {} \; \
      | sort \
      | sha256sum \
      | cut -d' ' -f1
  )

  # Patch this skill's hash in the temp lockfile.
  jq --arg name "$name" --arg hash "$actual_hash" \
    '.skills[$name].computedHash = $hash' \
    "$tmpfile" > "$tmpfile.new" && mv "$tmpfile.new" "$tmpfile"

  echo "✓ $name  →  $actual_hash"
  updated=$((updated + 1))
done < <(jq -r '.skills | to_entries[] | [.key, .value.localPath] | @tsv' "$LOCKFILE")

# Commit the updated lockfile.
mv "$tmpfile" "$LOCKFILE"

echo ""
echo "Updated $updated skill hash(es) in $LOCKFILE"
echo "Remember to commit the lockfile change."
