#!/usr/bin/env bash
# validate-schema.sh — Validates that domain schema and config files are well-formed JSON.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PASS=0
FAIL=0

check_json() {
  local file="$1"
  local label="$2"

  if [ ! -f "$file" ]; then
    echo "FAIL: $label — file not found: $file"
    FAIL=$((FAIL + 1))
    return
  fi

  if python3 -m json.tool "$file" > /dev/null 2>&1; then
    echo "PASS: $label — valid JSON"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label — invalid JSON"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Domain Schema Validation ==="
echo ""

check_json "$REPO_ROOT/core/domain/schema.json" "core/domain/schema.json"
check_json "$REPO_ROOT/core/domain/defaults.json" "core/domain/defaults.json"
check_json "$REPO_ROOT/core/domain/feedback.schema.json" "core/domain/feedback.schema.json"

# Check that the reference sample domain config exists
DOMAIN_FILE="$REPO_ROOT/core/domain/examples/scheduler.domain.json"
if [ -f "$DOMAIN_FILE" ]; then
  echo "PASS: core/domain/examples/scheduler.domain.json — exists"
  PASS=$((PASS + 1))
  check_json "$DOMAIN_FILE" "core/domain/examples/scheduler.domain.json (valid JSON)"
else
  echo "FAIL: core/domain/examples/scheduler.domain.json — not found"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
