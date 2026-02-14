# Commands

> **Experimental** — Commands and their behavior may change between versions.

Production Master provides 8 commands: the main orchestrator, 5 standalone tools, a domain management command, and a repo sync command.

---

## /production-master

**The main orchestrator.** Classifies intent, routes to agents, and runs the full investigation pipeline.

### Modes

| Mode | Trigger | Example |
|------|---------|---------|
| `FULL_INVESTIGATION` | Jira ticket ID or bug description | `/production-master SCHED-45895` |
| `QUERY_LOGS` | Service + "logs"/"errors" | `/production-master get errors from bookings-service last 2h` |
| `TRACE_REQUEST` | Request ID | `/production-master trace 1769611570.535540810122211411840` |
| `QUERY_METRICS` | "metrics"/"rate"/"latency"/"p99" | `/production-master show me error rate for bookings-service` |
| `SEARCH_SLACK` | "slack"/"discussion"/"thread" | `/production-master search slack for SCHED-45895` |
| `SEARCH_CODE` | "code"/"file"/"PR"/"commit" | `/production-master find where NullPointerException is thrown` |
| `TOGGLE_CHECK` | "toggle"/"feature flag" | `/production-master check toggle specs.bookings.SomeToggle` |

### Full Investigation Pipeline

When running a full investigation (Jira ticket or bug description):

1. **Step 0:** Classify intent, load domain config, create output directory, verify 6 MCP servers
2. **Step 1:** Parse Jira ticket (bug-context agent), enrich via Fire Console, validate artifact IDs
3. **Step 2:** Query Grafana logs (grafana-analyzer agent)
4. **Step 2.5:** Discover local code clone
5. **Step 3:** Map error propagation (codebase-semantics agent)
6. **Step 4:** Parallel data fetch — production-analyzer, slack-analyzer, codebase PRs, Fire Console (4 agents in parallel)
7. **Step 4.5:** Recovery window analysis (if resolution time known)
8. **Step 5:** Hypothesis generation & verification (sequential or agent team mode)
9. **Step 6:** Decision — Confirmed → fix plan, Declined → loop (max 5 iterations)
10. **Step 7:** Fix plan (fix-list agent)
11. **Step 8:** Documentation (documenter agent)
12. **Step 9:** Publish to Jira/Slack (optional, asks user)

### Ad-hoc Modes

QUERY_LOGS, TRACE_REQUEST, QUERY_METRICS, SEARCH_SLACK, SEARCH_CODE, and TOGGLE_CHECK execute directly without subagents or output directories.

---

## /fire-console

**Standalone domain object query.** Query Wix production objects (bookings, services, events, sites) via gRPC.

| Query Type | Example |
|-----------|---------|
| Find site | `/fire-console find site abc123` |
| Get booking | `/fire-console get booking abc-123 msid:xyz` |
| Get service | `/fire-console get service abc-123 msid:xyz` |
| Get event | `/fire-console get event abc-123 msid:xyz` |
| Search services | `/fire-console search bookings` |
| Custom RPC | `/fire-console invoke GetEnrichedBooking on bookings-bo-enriched-query-bookings` |

---

## /grafana-query

**Standalone Grafana query.** Query logs, trace requests, and check Prometheus metrics.

| Mode | Example |
|------|---------|
| Query logs | `/grafana-query errors from bookings-service last 2h` |
| Trace request | `/grafana-query trace 1769611570.535540810122211411840` |
| Query metrics | `/grafana-query error rate for bookings-service` |
| Error overview | `/grafana-query bookings-service` |

---

## /slack-search

**Standalone Slack search.** Find discussions, incidents, and deployment threads.

| Example |
|---------|
| `/slack-search SCHED-45895` |
| `/slack-search bookings outage last week` |
| `/slack-search deployments in #bookings-releases` |

Runs multiple keyword searches, fetches all thread replies, and presents raw results.

---

## /production-changes

**Standalone change discovery.** Find recent PRs, commits, and feature toggle changes.

| Query Type | Example |
|-----------|---------|
| Recent PRs | `/production-changes merged PRs last 3 days` |
| Commits | `/production-changes commits today` |
| Toggle changes | `/production-changes toggle specs.bookings.NewFlow` |
| All changes | `/production-changes what changed around 2026-02-10` |

---

## /resolve-artifact

**Standalone artifact validator.** Validate service names against Grafana.

| Example |
|---------|
| `/resolve-artifact bookings-service` |
| `/resolve-artifact bookings-service notifications-server sessions-server` |

Checks exact match, LIKE search, and caller name patterns. Returns a resolution table with confirmed/unresolved status.

---

## /update-context

**Domain management & learning.** Creates or updates domain configs and contributes improvements back via PR.

### New repo (no domain config)
1. Analyzes the current repo (language, build system, structure)
2. Interactively asks for Jira project, services, Slack channels, toggle prefix
3. Generates `domain.json`, `CLAUDE.md`, and `MEMORY.md`
4. Installs to `~/.claude/production-master/domains/<repo>/`
5. Offers to PR back to the production-master repo

### Existing domain config
1. Finds recent investigation directories
2. Extracts new patterns (services, errors, channels, shortcuts)
3. Shows diff and applies updates
4. Offers to PR changes back

---

## /git-update-agents

**Repo sync.** Syncs local agent/command changes back to the production-master Git repository.
