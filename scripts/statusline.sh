#!/usr/bin/env bash
# Production Master — Status Line for Claude Code
# Reads JSON from stdin (Claude Code status data) and outputs a formatted status line.
# If a Production Master pipeline is running, prepends the current phase.
#
# Usage in ~/.claude/settings.json:
#   "statusline": { "command": "bash /path/to/production-master/scripts/statusline.sh" }
#
# Input (JSON on stdin):
#   {"model":{"display_name":"Opus"},"context_window":{"used_percentage":35},"cost":{"total_cost_usd":2.46},"agent":{"name":"grafana-analyzer"}}
#
# Output examples:
#   Phase 4/9: Parallel Data Fetch | Opus | ▓▓▓▓░░░░ 35% | $2.46
#   [grafana-analyzer] Opus | ▓▓▓▓░░░░ 35% | $2.46
#   Opus | ▓▓▓▓░░░░ 35% | $2.46

set -euo pipefail

# Read JSON from stdin
INPUT=$(cat)

# Extract fields
MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Unknown"')
PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')
AGENT=$(echo "$INPUT" | jq -r '.agent.name // empty')

# Format cost
COST_FMT=$(printf '$%.2f' "$COST")

# Build progress bar (10 chars)
FILLED=$(( PCT / 10 ))
EMPTY=$(( 10 - FILLED ))
BAR=""
for ((i=0; i<FILLED; i++)); do BAR+="▓"; done
for ((i=0; i<EMPTY; i++)); do BAR+="░"; done

# Check for Production Master pipeline status
PM_STATUS=""
if [ -f /tmp/.production-master-status ]; then
  PM_STATUS=$(cat /tmp/.production-master-status 2>/dev/null || true)
fi

# Build output
if [ -n "$PM_STATUS" ]; then
  echo "$PM_STATUS | $MODEL | $BAR $PCT% | $COST_FMT"
elif [ -n "$AGENT" ]; then
  echo "[$AGENT] $MODEL | $BAR $PCT% | $COST_FMT"
else
  echo "$MODEL | $BAR $PCT% | $COST_FMT"
fi
