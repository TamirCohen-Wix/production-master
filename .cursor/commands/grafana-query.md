
# Grafana Query — Standalone Log & Metrics Tool

You query Grafana production data directly — app logs, access logs, request tracing, and Prometheus metrics. No subagents — execute MCP calls inline.

---

## Argument Parsing

Parse `$ARGUMENTS` for flags:
- If `$ARGUMENTS` is empty or contains `--help` or `-h`, print usage and STOP:

```
Usage: /grafana-query <service> [options]

Arguments:
  <service>           Service name (e.g., bookings-service, notifications-server)

Options:
  --level LEVEL       Log level filter: ERROR, WARN, INFO (default: all)
  --time RANGE        Time range: 1h, 2h, 6h, 1d, 7d (default: 1h)
  --search PATTERN    Message pattern to search for
  --caller CALLER     Code location filter
  --type TYPE         Query type: app-logs, access-logs, prometheus (default: app-logs)
  --help, -h          Show this help message

Examples:
  /grafana-query bookings-service --level ERROR --time 2h
  /grafana-query notifications-server --search "TimeoutException"
  /grafana-query bookings-service --type prometheus
```

- Parse known flags from `$ARGUMENTS`: split on spaces, extract `--key value` pairs
- Everything that isn't a flag is the positional argument (service name or request_id)

---

## Step 0: Load Domain Config

Detect the current repo name from `git remote get-url origin` (strip path and `.git` suffix).

Search for domain config in this order:
1. `~/.claude/production-master/domains/<repo-name>/domain.json` (primary)
2. `.claude/domain.json` (repo-local fallback)
3. `~/.claude/domain.json` (legacy global fallback)

If found, extract:
```
ARTIFACT_PREFIX = domain.json → artifact_prefix
PRIMARY_SERVICES = domain.json → primary_services (array of {name, artifact_id})
GRAFANA_URL = domain.json → grafana_url
GRAFANA_DASHBOARD = domain.json → grafana_app_analytics_dashboard
REQUEST_ID_FORMAT = domain.json → request_id_format
```

If not found: log "No domain.json found. Running in generic mode — provide full artifact IDs."

---

## Step 1: Parse Arguments & Classify

Parse `$ARGUMENTS` and classify into one of these modes:

| Mode | Trigger | Example |
|------|---------|---------|
| **QUERY_LOGS** | Service name + "logs"/"errors"/"warnings" | `errors from bookings-service last 2h` |
| **TRACE_REQUEST** | Request ID pattern (`\d{10}\.\d+`) | `trace 1769611570.535540810122211411840` |
| **QUERY_METRICS** | "metrics"/"rate"/"latency"/"p99"/"prometheus" | `error rate for bookings-service` |
| **ERROR_OVERVIEW** | Service name alone or "overview" | `bookings-service`, `overview notifications-server` |

Extract parameters:
- `artifact_id` — convert short names using `ARTIFACT_PREFIX` if domain config loaded
- `level` — ERROR, WARN, INFO (default: all for overview, ERROR for errors)
- `time_range` — parse from input (default: 1h)
- `search` — message pattern (optional)
- `request_id` — for TRACE_REQUEST mode

---

## Step 2: Load Skill

Read `skills/grafana-datasource/SKILL.md` for SQL templates, parameter formats, and tool reference.

---

## Step 3: Execute

Load the tool:
```
ToolSearch("+grafana-datasource query_app_logs")
```

### Calculate time range
```bash
date -u "+%Y-%m-%dT%H:%M:%S.000Z"
```
Compute `fromTime` and `toTime` in ISO 8601 UTC with `.000Z` suffix.

### MODE: QUERY_LOGS

**Step 3a: Count query first**
```
query_app_logs(
  sql: "SELECT level, count() as cnt FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = '<ARTIFACT>' GROUP BY level ORDER BY cnt DESC LIMIT 10",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

**Step 3b: Detail query** based on user's filters:
```
query_app_logs(
  sql: "SELECT timestamp, request_id, message, caller, error_class, error_code, stack_trace FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = '<ARTIFACT>' AND level = '<LEVEL>' ORDER BY timestamp DESC LIMIT 50",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

### MODE: TRACE_REQUEST

**Step 3a: Extract timeframe from request_id**
Wix request IDs contain a Unix timestamp: `<unix_timestamp>.<random>`
```bash
date -u -r <timestamp> "+%Y-%m-%dT%H:%M:%S.000Z"
```
- `fromTime` = timestamp - 600 seconds (10 min before)
- `toTime` = timestamp + 600 seconds (10 min after)

**Step 3b: Artifact discovery**
```
query_app_logs(
  sql: "SELECT DISTINCT nginx_artifact_name FROM logs_db.id_to_app_mv WHERE request_id = '<REQUEST_ID>' AND $__timeFilter(timestamp) LIMIT 500",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

**Step 3c: Cross-service app logs**
```
query_app_logs(
  sql: "SELECT timestamp, artifact_id, level, message, caller, error_class FROM logs_db.app_logs WHERE $__timeFilter(timestamp) AND request_id = '<REQUEST_ID>' ORDER BY timestamp ASC LIMIT 100",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

### MODE: QUERY_METRICS

Load the Prometheus tool:
```
ToolSearch("+grafana-datasource query_prometheus")
```

Determine PromQL from user input:
- Error rate → `rate(http_requests_total{artifact_id="<ARTIFACT>", status_code=~"5.."}[5m])`
- Request rate → `rate(http_requests_total{artifact_id="<ARTIFACT>"}[5m])`
- Latency → `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{artifact_id="<ARTIFACT>"}[5m]))`
- JVM memory → `jvm_memory_bytes_used{artifact_id="<ARTIFACT>"}`

```
query_prometheus(expr: "<PROMQL>", from: "<ISO>", to: "<ISO>")
```

### MODE: ERROR_OVERVIEW

Run the error aggregation query:
```
query_app_logs(
  sql: "SELECT message, count() as cnt FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = '<ARTIFACT>' AND level = 'ERROR' GROUP BY message ORDER BY cnt DESC LIMIT 100",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

---

## Step 4: Present Results

### For QUERY_LOGS:
```
=== App Logs: <artifact_id> ===
Time Range: <from> to <to>
Filters: level=<level>, search=<pattern>
Grafana URL: <constructed AppAnalytics URL>

### Summary
- Errors: X | Warnings: Y | Info: Z

### Log Entries
[timestamp] [level] [caller] message
  Error: <error_class>
  Stack: <first line of stack_trace>
```

### For TRACE_REQUEST:
```
=== Request Trace: <request_id> ===
Time Range: <from> to <to>
Services Involved: <list>

### Request Flow
| Timestamp | Service | Caller | Message | Level |
|-----------|---------|--------|---------|-------|

### Errors Found
[errors with stack traces]
```

### For QUERY_METRICS:
```
=== Metrics: <metric_type> for <artifact_id> ===
Time Range: <from> to <to>
PromQL: <query>

### Results
[formatted metric values]
```

**Rules:**
- ALWAYS include the Grafana AppAnalytics URL for log queries.
- No query expansion on empty results — report "No results found" and suggest filter adjustments.
- Fail fast on MCP errors — report immediately, don't retry silently.
- Never fabricate data.
