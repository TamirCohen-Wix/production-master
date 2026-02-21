#!/usr/bin/env bash
# validate-install.sh — Cursor installer syntax + behavior checks.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADAPTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_SCRIPT="$ADAPTER_DIR/scripts/install.sh"

errors=0

if [ ! -f "$INSTALL_SCRIPT" ]; then
  echo "FAIL: install.sh not found at $INSTALL_SCRIPT"
  exit 1
fi
echo "OK: install.sh exists"

if [ ! -s "$INSTALL_SCRIPT" ]; then
  echo "FAIL: install.sh is empty"
  exit 1
fi
echo "OK: install.sh is non-empty"

if bash -n "$INSTALL_SCRIPT" > /dev/null 2>&1; then
  echo "OK: install.sh passes syntax check (bash -n)"
else
  echo "FAIL: install.sh has syntax errors"
  errors=$((errors + 1))
fi

# Run installer in an isolated HOME so profile edits are testable.
TMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TMP_HOME"' EXIT
touch "$TMP_HOME/.zshrc"

run_install() {
  HOME="$TMP_HOME" PRODUCTION_MASTER_ACCESS_KEY="pm_test_key" bash "$INSTALL_SCRIPT" > /tmp/cursor-install-test.log 2>&1
}

if run_install; then
  echo "OK: install.sh executes non-interactively with key env var"
else
  echo "FAIL: install.sh execution failed"
  errors=$((errors + 1))
fi

if grep -Fq 'export PRODUCTION_MASTER_ACCESS_KEY="pm_test_key"' "$TMP_HOME/.zshrc"; then
  echo "OK: install.sh persisted access key to shell profile"
else
  echo "FAIL: install.sh did not persist access key export line"
  errors=$((errors + 1))
fi

if run_install; then
  echo "OK: install.sh is re-runnable"
else
  echo "FAIL: install.sh failed on second run"
  errors=$((errors + 1))
fi

key_count="$(grep -Fc 'export PRODUCTION_MASTER_ACCESS_KEY="pm_test_key"' "$TMP_HOME/.zshrc")"
if [ "$key_count" -eq 1 ]; then
  echo "OK: install.sh is idempotent (no duplicate export line)"
else
  echo "FAIL: expected one export line, found $key_count"
  errors=$((errors + 1))
fi

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: Cursor install script validated"
