#!/usr/bin/env bash
# validate-commands.sh — Verify all command files exist, are non-empty, and have proper markdown structure.
set -euo pipefail

COMMANDS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../commands" && pwd)"

EXPECTED_FILES=(
  fire-console.md
  git-update-agents.md
  grafana-query.md
  production-changes.md
  production-master-report.md
  production-master-feedback.md
  production-master.md
  resolve-artifact.md
  slack-search.md
  sync-cursor.md
  update-context.md
)

EXPECTED_COUNT=${#EXPECTED_FILES[@]}
errors=0

# 1. Check total count of .md files
actual_count=$(find "$COMMANDS_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
if [ "$actual_count" -ne "$EXPECTED_COUNT" ]; then
  echo "FAIL: Expected $EXPECTED_COUNT command files but found $actual_count"
  errors=$((errors + 1))
else
  echo "OK: Found $actual_count command files (expected $EXPECTED_COUNT)"
fi

# 2. Check each expected file exists, is non-empty, and has markdown structure
for file in "${EXPECTED_FILES[@]}"; do
  filepath="$COMMANDS_DIR/$file"
  if [ ! -f "$filepath" ]; then
    echo "FAIL: Missing file $file"
    errors=$((errors + 1))
    continue
  fi

  if [ ! -s "$filepath" ]; then
    echo "FAIL: File $file is empty"
    errors=$((errors + 1))
    continue
  fi

  # Check for at least one markdown header (# ...)
  if ! grep -qE '^#+ ' "$filepath"; then
    echo "FAIL: $file has no markdown headers"
    errors=$((errors + 1))
    continue
  fi

  echo "OK: $file"
done

# 3. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: All $EXPECTED_COUNT commands validated"
exit 0
