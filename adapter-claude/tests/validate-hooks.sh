#!/usr/bin/env bash
# validate-hooks.sh — Verify hooks.json structure, hook types, and referenced scripts.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADAPTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_FILE="$ADAPTER_DIR/hooks/hooks.json"

errors=0

# 1. Check hooks.json exists and is valid JSON
if [ ! -f "$HOOKS_FILE" ]; then
  echo "FAIL: hooks.json not found at $HOOKS_FILE"
  exit 1
fi
echo "OK: hooks.json exists"

if ! python3 -m json.tool "$HOOKS_FILE" > /dev/null 2>&1; then
  echo "FAIL: hooks.json is not valid JSON"
  exit 1
fi
echo "OK: hooks.json is valid JSON"

# 2. Verify required hook types exist
VALID_HOOK_TYPES="PreToolUse PostToolUse Notification Stop"

ACTUAL_HOOKS=$(python3 -c "
import json, sys
with open('$HOOKS_FILE') as f:
    data = json.load(f)
for key in data.get('hooks', {}):
    print(key)
")

for hook_type in $ACTUAL_HOOKS; do
  if echo "$VALID_HOOK_TYPES" | grep -qw "$hook_type"; then
    echo "OK: Hook type '$hook_type' is valid"
  else
    echo "FAIL: Unknown hook type '$hook_type'"
    errors=$((errors + 1))
  fi
done

# 3. Check that Notification and PostToolUse hooks exist
for required in Notification PostToolUse; do
  if echo "$ACTUAL_HOOKS" | grep -qw "$required"; then
    echo "OK: Required hook '$required' present"
  else
    echo "FAIL: Required hook '$required' missing"
    errors=$((errors + 1))
  fi
done

# 4. Verify all referenced scripts exist
REFERENCED_SCRIPTS=$(python3 -c "
import json, re, sys
with open('$HOOKS_FILE') as f:
    data = json.load(f)
for hook_type, entries in data.get('hooks', {}).items():
    for entry in entries:
        for hook in entry.get('hooks', []):
            cmd = hook.get('command', '')
            # Extract script paths that reference CLAUDE_PLUGIN_ROOT
            matches = re.findall(r'\$\{CLAUDE_PLUGIN_ROOT\}/([^ \"]+)', cmd)
            for m in matches:
                print(m)
")

if [ -n "$REFERENCED_SCRIPTS" ]; then
  while IFS= read -r script_path; do
    full_path="$ADAPTER_DIR/$script_path"
    if [ -f "$full_path" ]; then
      echo "OK: Referenced script exists: $script_path"
    else
      echo "FAIL: Referenced script missing: $script_path (expected at $full_path)"
      errors=$((errors + 1))
    fi
  done <<< "$REFERENCED_SCRIPTS"
else
  echo "OK: No external script references to validate"
fi

# 5. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) found"
  exit 1
fi

echo ""
echo "SUCCESS: hooks.json validated"
exit 0
