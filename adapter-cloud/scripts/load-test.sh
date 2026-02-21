#!/usr/bin/env bash
#
# load-test.sh — Submit 10 investigations concurrently, monitor queue depth
# and worker scaling, report total time, per-investigation time, and failures.
#
# Usage:
#   ./scripts/load-test.sh [BASE_URL] [API_KEY]
#
# Defaults:
#   BASE_URL = http://localhost:3000
#   API_KEY  = $PM_API_KEY (env var)

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
API_KEY="${2:-${PM_API_KEY:-test-key}}"
NUM_INVESTIGATIONS=10
RESULTS_DIR=$(mktemp -d)

echo "=== Production Master Load Test ==="
echo "Base URL:        $BASE_URL"
echo "Investigations:  $NUM_INVESTIGATIONS"
echo "Results dir:     $RESULTS_DIR"
echo ""

# ---------------------------------------------------------------------------
# Submit investigations concurrently
# ---------------------------------------------------------------------------

echo "--- Submitting $NUM_INVESTIGATIONS investigations concurrently ---"
OVERALL_START=$(date +%s)

pids=()
for i in $(seq 1 $NUM_INVESTIGATIONS); do
  (
    start_time=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
    ticket_id="LOAD-TEST-$(date +%s)-${i}"

    http_code=$(curl -s -o "$RESULTS_DIR/response-${i}.json" -w "%{http_code}" \
      -X POST "${BASE_URL}/api/v1/investigate" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${API_KEY}" \
      -d "{\"ticket_id\": \"${ticket_id}\", \"mode\": \"fast\"}")

    end_time=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
    duration=$((end_time - start_time))

    echo "${i},${ticket_id},${http_code},${duration}" > "$RESULTS_DIR/timing-${i}.csv"
  ) &
  pids+=($!)
done

# Wait for all submissions to complete
for pid in "${pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done

OVERALL_END=$(date +%s)
TOTAL_TIME=$((OVERALL_END - OVERALL_START))

echo "All submissions completed."
echo ""

# ---------------------------------------------------------------------------
# Monitor queue depth and worker scaling
# ---------------------------------------------------------------------------

echo "--- Queue Depth & Worker Scaling ---"

for check in $(seq 1 5); do
  # Query Prometheus metrics endpoint for queue depth
  queue_depth=$(curl -s "${BASE_URL}/metrics" 2>/dev/null \
    | grep -E '^pm_queue_depth' \
    | head -1 \
    | awk '{print $2}' || echo "N/A")

  echo "  Check ${check}/5: queue_depth=${queue_depth}"
  sleep 3
done

echo ""

# ---------------------------------------------------------------------------
# Report results
# ---------------------------------------------------------------------------

echo "--- Results ---"
echo ""

successes=0
failures=0
total_duration_ms=0
count=0

for i in $(seq 1 $NUM_INVESTIGATIONS); do
  timing_file="$RESULTS_DIR/timing-${i}.csv"
  if [[ -f "$timing_file" ]]; then
    IFS=',' read -r idx ticket_id http_code duration < "$timing_file"
    status="OK"
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      successes=$((successes + 1))
    else
      failures=$((failures + 1))
      status="FAIL"
    fi
    total_duration_ms=$((total_duration_ms + duration))
    count=$((count + 1))
    printf "  #%-2s  %-30s  HTTP %s  %5s ms  [%s]\n" "$idx" "$ticket_id" "$http_code" "$duration" "$status"
  fi
done

echo ""
echo "=== Summary ==="
echo "  Total investigations:  $NUM_INVESTIGATIONS"
echo "  Successes:             $successes"
echo "  Failures:              $failures"
echo "  Total wall-clock time: ${TOTAL_TIME}s"

if [[ $count -gt 0 ]]; then
  avg_ms=$((total_duration_ms / count))
  echo "  Avg per-investigation: ${avg_ms}ms"
fi

echo ""

# Cleanup
rm -rf "$RESULTS_DIR"

if [[ $failures -gt 0 ]]; then
  echo "LOAD TEST COMPLETED WITH FAILURES"
  exit 1
else
  echo "LOAD TEST PASSED"
  exit 0
fi
