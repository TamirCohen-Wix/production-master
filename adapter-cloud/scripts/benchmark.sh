#!/usr/bin/env bash
#
# benchmark.sh — Run 5 investigations across different domains and report
# performance metrics: average duration, token usage, and cost per investigation.
#
# Usage:
#   ./scripts/benchmark.sh [BASE_URL] [API_KEY]
#
# Defaults:
#   BASE_URL = http://localhost:3000
#   API_KEY  = $PM_API_KEY (env var)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
API_KEY="${2:-${PM_API_KEY:-test-key}}"
NUM_INVESTIGATIONS=5
RESULTS_DIR=$(mktemp -d)
POLL_INTERVAL=10    # seconds between status checks
POLL_TIMEOUT=600    # maximum wait per investigation (10 min)

# Sample tickets across different domains for realistic benchmarking.
# Override by setting BENCHMARK_TICKETS as a comma-separated list.
DEFAULT_TICKETS="BENCH-1,BENCH-2,BENCH-3,BENCH-4,BENCH-5"
IFS=',' read -ra TICKETS <<< "${BENCHMARK_TICKETS:-$DEFAULT_TICKETS}"

# Ensure we have exactly NUM_INVESTIGATIONS tickets
if [[ ${#TICKETS[@]} -lt $NUM_INVESTIGATIONS ]]; then
  echo "ERROR: Need at least $NUM_INVESTIGATIONS tickets. Got ${#TICKETS[@]}."
  echo "Set BENCHMARK_TICKETS=TICK-1,TICK-2,TICK-3,TICK-4,TICK-5"
  exit 1
fi

echo "========================================================"
echo "  Production Master Benchmark"
echo "========================================================"
echo "Base URL:        $BASE_URL"
echo "Investigations:  $NUM_INVESTIGATIONS"
echo "Results dir:     $RESULTS_DIR"
echo ""

# ---------------------------------------------------------------------------
# Submit investigations sequentially (to measure individual timings cleanly)
# ---------------------------------------------------------------------------

total_duration_ms=0
total_tokens=0
total_cost_cents=0
successes=0
failures=0

for i in $(seq 1 $NUM_INVESTIGATIONS); do
  ticket="${TICKETS[$((i - 1))]}"
  echo "--- Investigation $i/$NUM_INVESTIGATIONS: $ticket ---"

  start_time=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')

  # Submit investigation
  submit_response=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/api/v1/investigate" \
    -H "Content-Type: application/json" \
    -H "x-api-key: ${API_KEY}" \
    -d "{\"ticket_id\": \"${ticket}\", \"mode\": \"balanced\"}")

  http_code=$(echo "$submit_response" | tail -1)
  response_body=$(echo "$submit_response" | sed '$d')

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo "  SUBMIT FAILED (HTTP $http_code)"
    failures=$((failures + 1))
    echo "$i,$ticket,SUBMIT_FAILED,$http_code,0,0,0" > "$RESULTS_DIR/result-${i}.csv"
    continue
  fi

  # Extract investigation ID from response
  inv_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "")
  if [[ -z "$inv_id" ]]; then
    # Try alternate JSON field names
    inv_id=$(echo "$response_body" | grep -o '"investigation_id":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "unknown")
  fi

  echo "  Submitted: id=$inv_id"

  # Poll for completion
  elapsed=0
  status="pending"
  while [[ "$elapsed" -lt "$POLL_TIMEOUT" && "$status" != "completed" && "$status" != "failed" ]]; do
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))

    poll_response=$(curl -s \
      "${BASE_URL}/api/v1/investigations/${inv_id}" \
      -H "x-api-key: ${API_KEY}" 2>/dev/null || echo "{}")

    status=$(echo "$poll_response" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "pending")
    printf "  Polling... %3ds  status=%s\n" "$elapsed" "$status"
  done

  end_time=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
  duration_ms=$((end_time - start_time))

  # Extract token usage and cost from the final response
  tokens=$(echo "$poll_response" | grep -o '"total_tokens":[0-9]*' | head -1 | cut -d: -f2 2>/dev/null || echo "0")
  cost_cents=$(echo "$poll_response" | grep -o '"cost_cents":[0-9.]*' | head -1 | cut -d: -f2 2>/dev/null || echo "0")
  verdict=$(echo "$poll_response" | grep -o '"verdict":"[^"]*"' | head -1 | cut -d'"' -f4 2>/dev/null || echo "N/A")

  # Default to 0 if extraction failed
  tokens="${tokens:-0}"
  cost_cents="${cost_cents:-0}"

  if [[ "$status" == "completed" ]]; then
    successes=$((successes + 1))
    result_status="OK"
  else
    failures=$((failures + 1))
    result_status="FAIL"
  fi

  total_duration_ms=$((total_duration_ms + duration_ms))
  total_tokens=$((total_tokens + ${tokens%%.*}))
  # cost_cents might be a float; use awk for addition
  total_cost_cents=$(awk "BEGIN { printf \"%.2f\", $total_cost_cents + $cost_cents }")

  printf "  Result: %s  duration=%dms  tokens=%s  cost=%.2fc  verdict=%s\n" \
    "$result_status" "$duration_ms" "$tokens" "$cost_cents" "$verdict"

  echo "$i,$ticket,$result_status,$duration_ms,$tokens,$cost_cents,$verdict" > "$RESULTS_DIR/result-${i}.csv"
  echo ""
done

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

echo "========================================================"
echo "  Benchmark Report"
echo "========================================================"
echo ""

printf "%-5s  %-20s  %-6s  %10s  %10s  %10s  %s\n" \
  "#" "Ticket" "Status" "Duration" "Tokens" "Cost" "Verdict"
printf "%-5s  %-20s  %-6s  %10s  %10s  %10s  %s\n" \
  "---" "--------------------" "------" "----------" "----------" "----------" "----------"

for i in $(seq 1 $NUM_INVESTIGATIONS); do
  if [[ -f "$RESULTS_DIR/result-${i}.csv" ]]; then
    IFS=',' read -r idx ticket stat dur tok cst verd < "$RESULTS_DIR/result-${i}.csv"
    printf "%-5s  %-20s  %-6s  %8dms  %10s  %9sc  %s\n" \
      "$idx" "$ticket" "$stat" "$dur" "$tok" "$cst" "$verd"
  fi
done

echo ""
echo "--- Summary ---"
echo "  Total investigations:  $NUM_INVESTIGATIONS"
echo "  Successes:             $successes"
echo "  Failures:              $failures"

if [[ $NUM_INVESTIGATIONS -gt 0 ]]; then
  avg_duration=$((total_duration_ms / NUM_INVESTIGATIONS))
  avg_tokens=$((total_tokens / NUM_INVESTIGATIONS))
  avg_cost=$(awk "BEGIN { printf \"%.2f\", $total_cost_cents / $NUM_INVESTIGATIONS }")

  echo ""
  echo "--- Averages ---"
  echo "  Avg duration:          ${avg_duration}ms ($(awk "BEGIN { printf \"%.1f\", $avg_duration / 1000 }")s)"
  echo "  Avg token usage:       ${avg_tokens} tokens"
  echo "  Avg cost/investigation: ${avg_cost}c (\$$(awk "BEGIN { printf \"%.4f\", $avg_cost / 100 }"))"
  echo ""
  echo "--- Totals ---"
  echo "  Total duration:        ${total_duration_ms}ms ($(awk "BEGIN { printf \"%.1f\", $total_duration_ms / 1000 }")s)"
  echo "  Total tokens:          ${total_tokens}"
  echo "  Total cost:            ${total_cost_cents}c (\$$(awk "BEGIN { printf \"%.4f\", $total_cost_cents / 100 }"))"
fi

echo ""

# Cleanup
rm -rf "$RESULTS_DIR"

if [[ $failures -gt 0 ]]; then
  echo "BENCHMARK COMPLETED WITH FAILURES"
  exit 1
else
  echo "BENCHMARK PASSED"
  exit 0
fi
