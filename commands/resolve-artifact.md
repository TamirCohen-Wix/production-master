---
description: "Validate and resolve service names to Grafana artifact IDs"
user-invocable: false
---

# Resolve Artifact — Service Name Validator

You validate service names against Grafana to find the correct artifact IDs. No subagents — execute MCP calls inline.

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
```

---

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to extract one or more service names to validate.

Examples:
- `bookings-service` → validate single service
- `bookings-service notifications-server sessions-server` → validate multiple
- `com.wixpress.bookings.bookings-service` → validate full artifact ID

---

## Step 2: Load Skill

Read `skills/grafana-datasource/SKILL.md` for query parameters.

---

## Step 3: Execute

Load the tool:
```
ToolSearch("+grafana-datasource query_app_logs")
```

Calculate time range (last 1 hour):
```bash
date -u "+%Y-%m-%dT%H:%M:%S.000Z"
```

For each service name:

**Step 3a: Try exact match**
```
query_app_logs(
  sql: "SELECT count() as cnt FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = '<ARTIFACT>' LIMIT 1",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

If `ARTIFACT_PREFIX` available and name is short, try: `{ARTIFACT_PREFIX}.<name>`

**Step 3b: If count = 0, try LIKE search**
```
query_app_logs(
  sql: "SELECT DISTINCT artifact_id FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id LIKE '%<service-name>%' LIMIT 10",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

**Step 3c: Check as caller name within primary service**
```
query_app_logs(
  sql: "SELECT count() FROM app_logs WHERE $__timeFilter(timestamp) AND artifact_id = '<PRIMARY_SERVICE_ARTIFACT>' AND caller LIKE '%<service-name>%' LIMIT 1",
  fromTime: "<FROM>",
  toTime: "<TO>"
)
```

---

## Step 4: Present Results

```
=== Artifact Resolution ===

| Input Name | Resolved Artifact ID | Status | Log Count (1h) |
|-----------|---------------------|--------|-----------------|
| bookings-service | com.wixpress.bookings.bookings-service | Confirmed | 12,345 |
| notifications-server | com.wixpress.bookings.notifications-server | Confirmed | 890 |
| my-unknown-svc | — | Not Found | 0 |

### Suggestions for unresolved names
- `my-unknown-svc`: Did you mean one of these?
  - `com.wixpress.bookings.my-service` (found via LIKE)
  - `com.wixpress.other.unknown-svc` (found via LIKE)
```

**Rules:**
- Report exact matches and LIKE suggestions separately.
- If domain config has `primary_services`, show which ones are pre-configured.
- Never assume an artifact ID exists — always verify against Grafana.
