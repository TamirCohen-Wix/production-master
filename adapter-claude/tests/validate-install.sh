#!/usr/bin/env bash
# validate-install.sh — Syntax-check install.sh and verify referenced paths exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADAPTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ADAPTER_DIR/.." && pwd)"
INSTALL_SCRIPT="$ADAPTER_DIR/scripts/install.sh"

errors=0

# 1. Check install.sh exists and is non-empty
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

# 2. Syntax check (dry-run)
if bash -n "$INSTALL_SCRIPT" > /dev/null 2>&1; then
  echo "OK: install.sh passes syntax check (bash -n)"
else
  echo "FAIL: install.sh has syntax errors"
  errors=$((errors + 1))
fi

# 3. Syntax-check all other .sh scripts in scripts/
for script in "$ADAPTER_DIR"/scripts/*.sh; do
  [ -f "$script" ] || continue
  name=$(basename "$script")
  if bash -n "$script" > /dev/null 2>&1; then
    echo "OK: scripts/$name passes syntax check"
  else
    echo "FAIL: scripts/$name has syntax errors"
    errors=$((errors + 1))
  fi
done

# 4. Verify referenced paths exist: mcp-servers.json (used by install.sh)
if [ -f "$REPO_ROOT/mcp-servers.json" ]; then
  echo "OK: mcp-servers.json exists at repo root (referenced by install.sh)"
else
  echo "FAIL: mcp-servers.json not found at repo root"
  errors=$((errors + 1))
fi

# 5. Verify statusline.sh exists (referenced by install.sh)
if [ -f "$ADAPTER_DIR/scripts/statusline.sh" ]; then
  echo "OK: scripts/statusline.sh exists (referenced by install.sh)"
else
  echo "FAIL: scripts/statusline.sh not found"
  errors=$((errors + 1))
fi

# 6. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: install scripts validated"
exit 0
