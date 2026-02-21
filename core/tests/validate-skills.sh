#!/usr/bin/env bash
# validate-skills.sh — Verify that core/skills/ contains the expected skill directories.
# Exit 0 on success, exit 1 with details on failure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../skills" && pwd)"

EXPECTED_SKILLS=(
  context7
  fire-console
  ft-release
  github
  grafana-datasource
  grafana-mcp
  jira
  octocode
  slack
)
EXPECTED_COUNT=${#EXPECTED_SKILLS[@]}

errors=0

# 1. Count directories in core/skills/
actual_count=0
for entry in "$SKILLS_DIR"/*/; do
  [ -d "$entry" ] && actual_count=$((actual_count + 1))
done

if [ "$actual_count" -ne "$EXPECTED_COUNT" ]; then
  echo "FAIL: Expected $EXPECTED_COUNT skill directories, found $actual_count"
  errors=$((errors + 1))
else
  echo "OK: Found $EXPECTED_COUNT skill directories"
fi

# 2. Verify each expected directory exists and contains a non-empty SKILL.md
for skill in "${EXPECTED_SKILLS[@]}"; do
  skill_dir="$SKILLS_DIR/$skill"
  if [ ! -d "$skill_dir" ]; then
    echo "FAIL: Missing skill directory: $skill"
    errors=$((errors + 1))
    continue
  fi

  skill_md="$skill_dir/SKILL.md"
  if [ ! -f "$skill_md" ]; then
    echo "FAIL: $skill/SKILL.md does not exist"
    errors=$((errors + 1))
  elif [ ! -s "$skill_md" ]; then
    echo "FAIL: $skill/SKILL.md is empty"
    errors=$((errors + 1))
  else
    echo "OK: $skill/SKILL.md present and non-empty"
  fi
done

# 3. Summary
if [ "$errors" -gt 0 ]; then
  echo ""
  echo "FAILED: $errors error(s) detected"
  exit 1
fi

echo ""
echo "ALL CHECKS PASSED"
exit 0
