#!/bin/bash
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "unknown"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
COST=$(echo "$input" | jq -r '.cost.total_cost_usd // 0' | xargs printf "%.2f")
AGENT=$(echo "$input" | jq -r '.agent.name // empty')
FILLED=$((PCT * 20 / 100)); EMPTY=$((20 - FILLED))
BAR=$(printf "%${FILLED}s" | tr ' ' '▓')$(printf "%${EMPTY}s" | tr ' ' '░')

if [ -n "$AGENT" ]; then
  echo "[$AGENT] $MODEL | $BAR $PCT% | \$$COST"
else
  echo "$MODEL | $BAR $PCT% | \$$COST"
fi
