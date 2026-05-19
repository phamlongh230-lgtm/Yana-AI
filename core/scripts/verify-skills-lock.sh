#!/usr/bin/env bash
# Verify that the skills on disk match the hashes recorded in skills-lock.json.
# Exit codes:
#   0 — all skills match the lockfile
#   1 — drift detected (skill content differs from lock) or missing files
#   2 — cannot read lockfile or missing dependency (jq)
#
# Intended usage:
#   - Run manually before trusting a shipped template.
#   - Wire into CI to detect accidental skill edits that should have bumped the lock.

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
  echo "✗ verify-skills-lock: jq is required but not installed. Install jq and retry." >&2
  exit 2
fi

if [[ -z "$LOCKFILE" ]]; then
  echo "✗ verify-skills-lock: skills-lock.json not found in expected locations" >&2
  exit 2
fi

# Resolve a skill localPath to an actual directory on disk.
# Tries 3 fallback locations to support repo scaffold + installed pack layouts.
resolve_skill_path() {
  local local_path="$1"

  # 1. Try as-is (works when installed: .claude/skills/foo)
  local p="$PROJECT_ROOT/$local_path"
  [[ -d "$p" ]] && echo "$p" && return 0

  # 2. Map .claude/skills/<rel> → core/skills/<rel> (repo scaffold layout)
  if [[ "$local_path" == .claude/skills/* ]]; then
    local rel="${local_path#.claude/skills/}"
    p="$PROJECT_ROOT/core/skills/$rel"
    [[ -d "$p" ]] && echo "$p" && return 0

    # 3. Map .claude/skills/<rel> → skills/<rel> (minimal install layout)
    p="$PROJECT_ROOT/skills/$rel"
    [[ -d "$p" ]] && echo "$p" && return 0
  fi

  echo ""
  return 1
}

drift=0
missing=0
ok=0

# Iterate over every skill recorded in the lockfile.
while IFS=$'\t' read -r name local_path expected_hash; do
  full_path=$(resolve_skill_path "$local_path")

  if [[ -z "$full_path" ]]; then
    echo "✗ MISSING  $name  (looked: $local_path | core/skills/... | skills/...)"
    missing=$((missing + 1))
    continue
  fi

  # Match the hashing strategy used when the lockfile was generated:
  # hash every file under the skill dir (excluding mcp.json), sorted, sha256sum'd.
  # Use relative paths (cd + find .) so the hash is stable across environments —
  # absolute paths would leak the install location into the digest.
  actual_hash=$(
    cd "$full_path" && \
    find . -type f -not -name "mcp.json" -exec sha256sum {} \; \
      | sort \
      | sha256sum \
      | cut -d' ' -f1
  )

  if [[ -z "$expected_hash" || "$expected_hash" == "null" ]]; then
    echo "~ SKIPPED  $name  (no hash in lockfile — run update-skills-lock.sh to populate)"
    ok=$((ok + 1))
  elif [[ "$actual_hash" == "$expected_hash" ]]; then
    echo "✓ OK       $name"
    ok=$((ok + 1))
  else
    echo "⚠ DRIFT    $name"
    echo "           expected $expected_hash"
    echo "           actual   $actual_hash"
    drift=$((drift + 1))
  fi
done < <(jq -r '.skills | to_entries[] | [.key, .value.localPath, .value.computedHash] | @tsv' "$LOCKFILE")

echo ""
echo "Summary: $ok ok · $drift drift · $missing missing"

if [[ $drift -gt 0 || $missing -gt 0 ]]; then
  echo ""
  echo "If the drift is intentional, regenerate with:"
  echo "  bash core/scripts/update-skills-lock.sh"
  exit 1
fi

exit 0
