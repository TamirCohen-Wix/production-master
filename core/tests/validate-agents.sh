#!/usr/bin/env bash
# validate-agents.sh — Verify that all 12 agent files exist in core/agents/
set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "$0")/../agents" && pwd)"

EXPECTED_FILES=(
  artifact-resolver.md
  bug-context.md
  codebase-semantics.md
  documenter.md
  fix-list.md
  grafana-analyzer.md
  hypotheses.md
  production-analyzer.md
  publisher.md
  skeptic.md
  slack-analyzer.md
  verifier.md
)

EXPECTED_COUNT=${#EXPECTED_FILES[@]}
errors=0

# Check total count of .md files
actual_count=$(find "$AGENTS_DIR" -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')
if [ "$actual_count" -ne "$EXPECTED_COUNT" ]; then
  echo "FAIL: Expected $EXPECTED_COUNT .md files but found $actual_count"
  errors=$((errors + 1))
else
  echo "OK: Found $actual_count .md files (expected $EXPECTED_COUNT)"
fi

# Check each expected file exists and is non-empty
for file in "${EXPECTED_FILES[@]}"; do
  filepath="$AGENTS_DIR/$file"
  if [ ! -f "$filepath" ]; then
    echo "FAIL: Missing file $file"
    errors=$((errors + 1))
  elif [ ! -s "$filepath" ]; then
    echo "FAIL: File $file is empty"
    errors=$((errors + 1))
  else
    echo "OK: $file"
  fi
done

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: All $EXPECTED_COUNT agents validated"
exit 0
