#!/usr/bin/env bash
# Validates that all 6 orchestrator modules exist and are non-empty.
# Each module must have at least 20 lines.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORCHESTRATOR_DIR="$(cd "$SCRIPT_DIR/../orchestrator" && pwd)"

MODULES=(
  "intent-classifier.md"
  "state-machine.md"
  "hypothesis-loop.md"
  "agent-dispatch.md"
  "findings-summary-schema.md"
  "recovery-protocol.md"
)

MIN_LINES=20
PASS=0
FAIL=0

echo "=== Orchestrator Module Validation ==="
echo ""

for module in "${MODULES[@]}"; do
  file="$ORCHESTRATOR_DIR/$module"
  if [[ ! -f "$file" ]]; then
    echo "FAIL: $module — file not found"
    FAIL=$((FAIL + 1))
    continue
  fi

  lines=$(wc -l < "$file")
  if [[ "$lines" -lt "$MIN_LINES" ]]; then
    echo "FAIL: $module — only $lines lines (minimum $MIN_LINES)"
    FAIL=$((FAIL + 1))
  else
    echo "PASS: $module — $lines lines"
    PASS=$((PASS + 1))
  fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed out of ${#MODULES[@]} modules"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

echo "All orchestrator modules validated successfully."
exit 0
