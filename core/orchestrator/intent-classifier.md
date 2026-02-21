# Intent Classifier

Extracted from `commands/production-master.md` STEP 0. This module defines how the orchestrator classifies user intent and routes to the appropriate workflow.

> Cross-references: After classification, `FULL_INVESTIGATION` mode enters the [State Machine](state-machine.md). Ad-hoc modes route directly to sub-commands.

---

## Argument Parsing

Parse `$ARGUMENTS` for flags:
- If `$ARGUMENTS` contains `--help` or `-h`, print usage and STOP:

```
Usage: /production-master <ticket-or-query> [options]

Arguments:
  <ticket-or-query>   Jira ticket ID or free-text query

Options:
  --skip-slack        Skip Slack search in parallel data fetch
  --skip-grafana      Skip Grafana log analysis
  --service NAME      Override primary service name
  --verbose           Show detailed agent outputs during pipeline
  --help, -h          Show this help message

Modes (auto-detected from input):
  SCHED-12345                              Full investigation
  errors from bookings-service last 2h     Query logs (-> /grafana-query)
  trace 1769611570.535540810122211411840    Trace request (-> /grafana-query)
  show me error rate for bookings-service  Query metrics (-> /grafana-query)
  search slack for SCHED-45895             Search Slack (-> /slack-search)
  check toggle specs.bookings.SomeToggle   Check toggles (-> /production-changes)

Sub-commands (also available standalone):
  /grafana-query      Query Grafana logs & metrics
  /slack-search       Search Slack discussions
  /production-changes Find PRs, commits, toggle changes
  /resolve-artifact   Validate service artifact IDs
  /fire-console       Query domain objects via gRPC
```

- Parse known flags: `--skip-slack`, `--skip-grafana`, `--service <name>`, `--verbose`
- Store flags as `PIPELINE_FLAGS` for use in later steps
- Everything that isn't a flag is the main argument for intent classification

---

## Intent Modes

Parse `$ARGUMENTS` and classify into one of these modes:

| Mode | Trigger | Example |
|------|---------|---------|
| **FULL_INVESTIGATION** | Jira ticket ID, or bug description requiring root cause analysis | `SCHED-45895`, `bookings are failing for site X since yesterday` |
| **QUERY_LOGS** | Request for app logs from a specific service | `get errors from bookings-service last 2 hours`, `show me logs for notifications-server level ERROR` |
| **TRACE_REQUEST** | Request ID provided, wants to trace a request flow | `trace 1769611570.535540810122211411840`, `what happened to request 1769...` |
| **QUERY_METRICS** | Request for Prometheus metrics or dashboard data | `show me error rate for bookings-service`, `p99 latency for sessions-server` |
| **SEARCH_SLACK** | Wants to find Slack discussions about a topic | `what did the team say about the bookings outage`, `search slack for SCHED-45895` |
| **SEARCH_CODE** | Wants to find code, PRs, or repo info | `find where NullPointerException is thrown in bookings-service`, `show me recent PRs for scheduler` |
| **TOGGLE_CHECK** | Wants feature toggle status | `check feature toggle specs.bookings.SomeToggle`, `what toggles changed for bookings` |

---

## Classification Rules

- If `$ARGUMENTS` matches a Jira ticket pattern (`[A-Z]+-\d+`) -> `FULL_INVESTIGATION`
- If contains a request_id pattern (`\d{10}\.\d+`) -> `TRACE_REQUEST`
- If mentions "logs", "errors", "app_logs", with a service/artifact -> `QUERY_LOGS`
- If mentions "metric", "rate", "latency", "p99", "prometheus" -> `QUERY_METRICS`
- If mentions "slack", "discussion", "thread", "channel" -> `SEARCH_SLACK`
- If mentions "code", "file", "PR", "pull request", "commit", "repo" -> `SEARCH_CODE`
- If mentions "toggle", "feature flag", "feature toggle" -> `TOGGLE_CHECK`
- If unclear or multi-sentence bug description -> `FULL_INVESTIGATION`
- If empty -> Ask the user what they need.

Store the classified mode as `MODE`.

---

## Ad-Hoc Mode Routing Table

For non-investigation modes, the orchestrator delegates to the corresponding sub-command's logic. Each sub-command is also available as a standalone user-invocable command.

| Mode | Sub-Command | Description |
|------|-------------|-------------|
| `QUERY_LOGS` | `/grafana-query` | Query Grafana app logs |
| `TRACE_REQUEST` | `/grafana-query` | Trace a request across services |
| `QUERY_METRICS` | `/grafana-query` | Query Prometheus metrics |
| `SEARCH_SLACK` | `/slack-search` | Search Slack discussions |
| `SEARCH_CODE` | `/production-changes` | Search code, PRs, commits |
| `TOGGLE_CHECK` | `/production-changes` | Check feature toggle status |

**Execution:** When the classified MODE is one of the above, follow the corresponding sub-command file's logic directly (load domain config, parse arguments, load skill, execute, present results). The sub-command files contain the full implementation.

**Rules:**
- Ad-hoc modes execute directly -- no subagents needed, no output directory.
- Always include Grafana URLs in query results for user verification.
- No query expansion on empty results -- report what was found (or not found) and suggest filter adjustments.
- Fail fast on MCP errors -- report immediately, don't retry silently.

---

## Domain Config Loading (Step 0.1.5)

Detect the current repo name from `git remote get-url origin` (strip path and `.git` suffix).

Search for domain config in this order:
1. `~/.claude/production-master/domains/<repo-name>/domain.json` (primary -- installed by production-master)
2. `.claude/domain.json` (repo-local fallback -- for repos that bundle their own config)
3. `~/.claude/domain.json` (legacy global fallback)

If found, store as `DOMAIN_CONFIG` and extract:

```
ARTIFACT_PREFIX    = domain.json -> artifact_prefix     (e.g., "com.wixpress.bookings")
JIRA_PROJECT       = domain.json -> jira_project        (e.g., "SCHED")
GITHUB_ORG         = domain.json -> github_org          (e.g., "wix-private")
REPO_NAME          = domain.json -> repo                (e.g., "scheduler")
GITHUB_REPO        = domain.json -> github_repo         (e.g., "wix-private/scheduler")
PRIMARY_SERVICES   = domain.json -> primary_services    (array of {name, artifact_id})
SLACK_CHANNELS     = domain.json -> slack_channels      (object with alerts, dev, incidents)
TOGGLE_PREFIX      = domain.json -> toggle_prefix       (e.g., "specs.bookings")
GRAFANA_URL        = domain.json -> grafana_url         (e.g., "https://grafana.wixpress.com")
GRAFANA_DASHBOARD  = domain.json -> grafana_app_analytics_dashboard (e.g., "olcdJbinz")
REQUEST_ID_FORMAT  = domain.json -> request_id_format   (e.g., "<unix_timestamp>.<random>")
```

If `domain.json` is NOT found:
- The pipeline still works, but will prompt for service names and artifact IDs when needed
- Jira ticket patterns still auto-detect from the ticket ID prefix
- Log: "No domain.json found. Running in generic mode -- you may need to provide artifact IDs manually."

Use these variables throughout all subsequent steps instead of hardcoded values.

---

## Status Line Protocol

At each state transition, write the current phase to a temp file so the status bar can display it:
```bash
echo "Phase N/9: <phase name>" > /tmp/.production-master-status
```
At `COMPLETE`, remove it: `rm -f /tmp/.production-master-status`
