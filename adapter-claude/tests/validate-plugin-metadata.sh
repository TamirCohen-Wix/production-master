#!/usr/bin/env bash
# validate-plugin-metadata.sh — Verify plugin.json and marketplace.json are consistent.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADAPTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLUGIN_JSON="$ADAPTER_DIR/.claude-plugin/plugin.json"
MARKETPLACE_JSON="$ADAPTER_DIR/.claude-plugin/marketplace.json"

errors=0

# 1. Check both files exist and are valid JSON
for file in "$PLUGIN_JSON" "$MARKETPLACE_JSON"; do
  label=$(basename "$file")
  if [ ! -f "$file" ]; then
    echo "FAIL: $label not found at $file"
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

# If either file is missing/invalid, bail early
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found (cannot continue consistency checks)"
  exit 1
fi

# 2. Extract values from plugin.json
PLUGIN_NAME=$(python3 -c "import json; print(json.load(open('$PLUGIN_JSON'))['name'])")
PLUGIN_VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_JSON'))['version'])")

echo "OK: plugin.json — name=$PLUGIN_NAME version=$PLUGIN_VERSION"

# 3. Extract values from marketplace.json
MARKETPLACE_NAME=$(python3 -c "import json; print(json.load(open('$MARKETPLACE_JSON'))['name'])")
MARKETPLACE_PLUGIN_NAME=$(python3 -c "import json; print(json.load(open('$MARKETPLACE_JSON'))['plugins'][0]['name'])")
MARKETPLACE_PLUGIN_VERSION=$(python3 -c "import json; print(json.load(open('$MARKETPLACE_JSON'))['plugins'][0]['version'])")

echo "OK: marketplace.json — name=$MARKETPLACE_NAME plugin[0].name=$MARKETPLACE_PLUGIN_NAME plugin[0].version=$MARKETPLACE_PLUGIN_VERSION"

# 4. Check name consistency
if [ "$PLUGIN_NAME" != "$MARKETPLACE_NAME" ]; then
  echo "FAIL: Plugin name mismatch — plugin.json='$PLUGIN_NAME' vs marketplace.json='$MARKETPLACE_NAME'"
  errors=$((errors + 1))
else
  echo "OK: Plugin name consistent: $PLUGIN_NAME"
fi

if [ "$PLUGIN_NAME" != "$MARKETPLACE_PLUGIN_NAME" ]; then
  echo "FAIL: Plugin name mismatch — plugin.json='$PLUGIN_NAME' vs marketplace.json plugins[0].name='$MARKETPLACE_PLUGIN_NAME'"
  errors=$((errors + 1))
else
  echo "OK: Marketplace plugin entry name matches: $MARKETPLACE_PLUGIN_NAME"
fi

# 5. Check version consistency
if [ "$PLUGIN_VERSION" != "$MARKETPLACE_PLUGIN_VERSION" ]; then
  echo "FAIL: Version mismatch — plugin.json='$PLUGIN_VERSION' vs marketplace.json plugins[0].version='$MARKETPLACE_PLUGIN_VERSION'"
  errors=$((errors + 1))
else
  echo "OK: Version consistent: $PLUGIN_VERSION"
fi

# 6. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: plugin metadata is consistent"
exit 0
