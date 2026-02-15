# Memory

## Production Master Pipeline

### Investigation Cycle (CORRECT ORDER)
1. Bug Context (Jira fetch + bug-context agent)
2. Parallel Data Fetch (Grafana, Production, Codebase, Slack — all 4 in parallel)
3. Hypothesis Generation (based on fetched evidence)
4. Verification (confidence score 0-100%)
   - If >= 85%: proceed to fix plan
   - If < 85%: verifier specifies per-agent targeted data requests, loop back to step 2
   - Max 3 iterations

### Sub-Agent Rules
- Agents use `ToolSearch` with keyword queries (e.g., `ToolSearch("+jira get-issues")`) to dynamically discover and load MCP tools
- Agent files live in `~/.claude/agents/` (USER scope), command files in `~/.claude/commands/` (USER scope)
- When making pipeline changes, always update the relevant agent/command files
- **File location consistency:** Agents, commands, and skills are USER-scoped (`~/.claude/`). Only auto-memory is project-scoped. Never create project-scoped duplicates.
- **ALL subagents use `model: SUBAGENT_MODEL`** — read from env var `PRODUCTION_MASTER_SUBAGENT_MODEL` in `~/.claude/settings.json`, defaults to `"sonnet"`. Valid: `"sonnet"`, `"opus"`, `"haiku"`

### Agent-to-Tool Mapping
| Agent | MCP Tool Categories | Key Tools |
|-------|-------------------|-----------|
| slack-analyzer | slack (6 tools) | `search-messages`, `get_channel_history`, `get_thread_replies` |
| production-analyzer | github (10), devex (12), gradual-feature-release (4) | `list_commits`, `list_pull_requests`, `find_commits_by_date_range` |
| codebase-semantics | octocode (6) | `githubSearchCode`, `githubGetFileContent`, `githubViewRepoStructure` |
| grafana-analyzer | grafana-datasource (10) | `query_app_logs`, `query_access_logs`, `query_prometheus` |
| bug-context | jira (4) | `get-issues`, `get-issue-changelog` |
| hypotheses | any (as needed) | grafana, feature toggles, octocode |
| verifier | any (as needed) | grafana, devex, github, feature toggles, jira |
| skeptic | any (as needed) | cross-examines two hypotheses, applies 5-point checklist |
| fix-list | gradual-feature-release (6) | `search-feature-toggles`, `create-feature-release` |
| documenter | jira (2), slack (1) | `comment-on-issue`, `find-channel-id` |
| publisher | jira (2), slack (4) | `comment-on-issue`, `slack_post_message`, `slack_find-channel-id` |

### MCP Tools
- Sub-agents DO have access to ToolSearch and MCP tools — they can load and use them directly
- Orchestrator checks ALL 6 MCP servers in Step 0.3 (hard gate) — ALL must pass, no exceptions
- Agents use `ToolSearch` with **keyword queries** (e.g., `ToolSearch("+jira get-issues")`) — never hardcode full tool names since the prefix depends on the server key name in `~/.claude.json` and may vary per installation
- **Local fallback (e.g., `gh` CLI, local git) requires explicit user approval** and must be recorded in the agent's trace file

### MCP Servers
All HTTP servers go through `mcp-s.wewix.net` proxy, authenticated via `x-user-access-key` header.

| Server key (in ~/.claude.json) | MCP namespace | Notes |
|---|---|---|
| `jira` | jira | Jira CRUD |
| `Slack` | slack | Slack read/write |
| `github` | github | GitHub operations |
| `grafana-datasource` | grafana-datasource | Query logs, metrics |
| `grafana-mcp` | grafana-mcp | Dashboards, alerts |
| `FT-release` | gradual-feature-release | Feature toggles |
| `context-7` | context7 | Library docs |
| `fire-console` | fire-console | gRPC domain queries (no auth header) |
| `octocode` | octocode | Code search (npx transport, not HTTP) |

**Key insight:** Tool names are `mcp__{server_key}__{namespace}__{tool}`. The server key comes from the user's config and may differ across installations. Always use keyword `ToolSearch` to discover tools dynamically.

### Output Directory
- Location: `.claude/debug/` inside the repo root (or `./debug/` outside a repo)
- Directory name: `debug-<TASK-SLUG>-<YYYY-MM-DD-HHmmss>/` where TASK-SLUG is Jira ticket ID or auto-generated summary
- Each agent gets its OWN subdirectory: `<debug-dir>/<agent-name>/`
- Output files are versioned: `<agent-name>-output-V<N>.md` (N = invocation count for that agent in this run)
- **Trace files**: `<agent-name>-trace-V<N>.md` — written alongside output files, contain input + action log
- Example: `debug-SCHED-4353-2026-02-11-143000/grafana-analyzer/grafana-analyzer-output-V1.md`
- Example: `debug-SCHED-4353-2026-02-11-143000/grafana-analyzer/grafana-analyzer-trace-V1.md`
- `findings-summary.md` and `report.md` stay at the debug dir root
- Sub-agents must be told both OUTPUT_FILE and TRACE_FILE paths
- **Trace isolation**: Trace files are NEVER passed to other agents. Only the human operator reads them.

### Agent Task-Driven Design
- Agents do NOT know about orchestration steps ("Step 3", "Step 4", "parallel", "primary")
- The orchestrator passes a `TASK` input that tells the agent exactly what to do
- codebase-semantics has two report types: "Report Type A" (error propagation) and "Report Type B" (PR analysis)
- The orchestrator selects the report type via the TASK field

### Grafana Queries
- Sub-agents should run LIVE queries via MCP tools (discovered via ToolSearch), NOT build URLs
- Let them choose the appropriate query tool based on what they need (app logs, access logs, prometheus, loki, etc.)
- Key artifact IDs: `com.wixpress.bookings.reader.bookings-reader`, `com.wixpress.bookings.notifications-server`
- Always compare baseline vs incident vs post-incident periods

### Jira
- Load tool: `ToolSearch("+jira get-issues")`, then fetch with JQL `key = SCHED-XXXXX`
- Fields: key, summary, status, priority, reporter, assignee, description, comment

### Documentation Reports
- Keep reports SHORT and DIRECT — under 60 lines ideal
- No repetition — state the root cause ONCE, not 5 times in different sections
- Structure: TL;DR -> Evidence (numbers) -> Causal Chain -> Fix -> References
- Skip verbose sections: lessons learned, people involved, hypotheses explored
- People won't read long reports

### Slack Message Posting Rules
- **NEVER reference a Slack channel by name or link without verifying it exists first** — use `slack_find-channel-id` to confirm
- **NEVER fabricate channel names** — if you don't know the exact channel, omit the reference or say "the relevant team channel"
- **Verify ALL hyperlinks before posting** — broken links undermine credibility
- When posting investigation summaries to Slack threads, keep links to verified resources only (Grafana URLs, Jira tickets, GitHub PRs)

### Agent Teams (Hypothesis Phase)
- Steps 5-6 use agent teams (experimental) when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set
- 3 teammates: hypothesis-tester-A, hypothesis-tester-B, skeptic
- Tasks: A and B test competing theories in parallel, skeptic is blocked by both, cross-examines and produces verdict
- Fallback: if env var not set, uses sequential subagent approach (old Steps 5-6)
- Setting lives in `~/.claude/settings.json` under `env`
- Skeptic agent: `~/.claude/agents/skeptic.md` — replaces verifier role within teams
- `verifier.md` still exists for sequential fallback path

### Hooks
- **Notification hook** — macOS `osascript` desktop notification when Claude needs input (all notification types)
- **Link validation hook** — `PostToolUse` on `Write`, runs `~/.claude/hooks/validate-report-links.sh`
  - Checks `*report.md` files for: malformed Grafana URLs (missing time range/artifact), bad GitHub PR links, invalid Slack archive links, placeholder/truncated URLs
  - Returns `decision: "block"` with feedback to Claude listing broken links
  - Claude fixes links before proceeding to publisher
- Both hooks configured in `~/.claude/settings.json` under `hooks`

### Output Styles
- `~/.claude/output-styles/investigation-report.md` — Professional formatting for production investigation sessions
- `~/.claude/output-styles/publisher-format.md` — Platform-specific formatting (Jira wiki markup, Slack mrkdwn, GitHub MD)
- Activate with `/output-style investigation-report` or `/output-style publisher-format`
- Output styles affect the main session only, NOT subagents (subagent formatting is in their `.md` files)

### Publisher Agent
- Step 9 in the pipeline (after documenter), optional — asks user before publishing
- Publishes to Jira (wiki markup) and/or Slack (mrkdwn)
- Validates all links before posting
- Jira: `comment-on-issue`, Slack: `slack_post_message` (via `mcp__Slack__` write server)

## Codebase Patterns

### Feature Toggles
- Feature toggles are defined in `BUILD.bazel` (`feature_toggles = ["name"]`) and managed via **Wix Dev Portal** (NOT Petri)
- Use `gradual-feature-release` MCP tools to search/query toggle status on Wix Dev Portal
- Legacy: some services still have Petri specs but new toggles should use Wix Dev Portal

### Rate Limiting
- bookings-reader uses `LoomPrimeRateLimiter` with MSID as entity key
- `FeatureLimitExceeded` extends `WixApplicationRuntimeException` with `ResourceExhausted`
- VIP policies managed via Fire Console, documented in `docs/rate-limit-configuration-guide.md`

### TimeCapsule + Greyhound
- TimeCapsule is built on Greyhound (confirmed by stack traces)
- Retry config in `notifications-server-config.json.erb`: 1, 10, 20, 60, 120, 360 minutes
