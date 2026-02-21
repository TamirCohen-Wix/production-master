#!/usr/bin/env bash
# validate-mcp-integration.sh — Verify mcp-servers.json is consistent between root and core/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ROOT_MCP="$REPO_ROOT/mcp-servers.json"
CORE_MCP="$REPO_ROOT/core/mcp-servers.json"

errors=0

# 1. Check both files exist
for file in "$ROOT_MCP" "$CORE_MCP"; do
  label="${file#$REPO_ROOT/}"
  if [ ! -f "$file" ]; then
    echo "FAIL: $label not found"
    errors=$((errors + 1))
    continue
  fi
  echo "OK: $label exists"

  if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
    echo "FAIL: $label is not valid JSON"
    errors=$((errors + 1))
  else
    echo "OK: $label is valid JSON"
  fi
done

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found (cannot continue consistency checks)"
  exit 1
fi

# 2. Compare server keys between root and core
ROOT_KEYS=$(python3 -c "
import json
with open('$ROOT_MCP') as f:
    data = json.load(f)
for k in sorted(data.get('mcpServers', {})):
    print(k)
")

CORE_KEYS=$(python3 -c "
import json
with open('$CORE_MCP') as f:
    data = json.load(f)
for k in sorted(data.get('mcpServers', {})):
    print(k)
")

if [ "$ROOT_KEYS" = "$CORE_KEYS" ]; then
  SERVER_COUNT=$(echo "$ROOT_KEYS" | wc -l | tr -d ' ')
  echo "OK: Both files have the same $SERVER_COUNT MCP server keys"
else
  echo "FAIL: MCP server keys differ between root and core"
  echo "  Root keys: $(echo "$ROOT_KEYS" | tr '\n' ' ')"
  echo "  Core keys: $(echo "$CORE_KEYS" | tr '\n' ' ')"
  errors=$((errors + 1))
fi

# 3. Verify content is identical (root should be a copy/symlink of core)
if diff -q "$ROOT_MCP" "$CORE_MCP" > /dev/null 2>&1; then
  echo "OK: Root and core mcp-servers.json are identical"
else
  echo "FAIL: Root and core mcp-servers.json differ in content"
  errors=$((errors + 1))
fi

# 4. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: MCP integration validated"
exit 0
