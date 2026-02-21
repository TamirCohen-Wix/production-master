# Recovery Protocol

Extracted from `commands/production-master.md` orchestration rules related to error handling, MCP reliability, agent failure handling, and mid-investigation recovery.

> Cross-references: MCP checks happen during Phase 0 in [state-machine.md](state-machine.md). Agent re-launch rules in [agent-dispatch.md](agent-dispatch.md). Hypothesis iteration limits in [hypothesis-loop.md](hypothesis-loop.md).

---

## MCP Server Failure Handling

### Step 0.3: Pre-Flight MCP Verification (HARD GATE)

Check EVERY MCP server the pipeline depends on. Run these checks in parallel using lightweight calls.

**Required checks (ALL must pass):**

| # | Category | ToolSearch query | Check Call |
|---|----------|-----------------|------------|
| 1 | Jira | `ToolSearch("+jira get-issues")` | `get-issues(projectKey: "{JIRA_PROJECT}", maxResults: 1, fields: ["key"])` |
| 2 | Grafana | `ToolSearch("+grafana-datasource list_datasources")` | `list_datasources()` |
| 3 | Slack | `ToolSearch("+slack slack_list_channels")` | `slack_list_channels(limit: 1)` |
| 4 | GitHub | `ToolSearch("+github search_repositories")` | `search_repositories(query: "{REPO_NAME} org:{GITHUB_ORG}", perPage: 1)` |
| 5 | Feature Toggles | `ToolSearch("+gradual-feature-release list-strategies")` | `list-strategies()` |
| 6 | Octocode | `ToolSearch("+octocode githubSearchCode")` | `githubSearchCode(queries: [{mainResearchGoal: "health check", researchGoal: "verify connection", reasoning: "MCP connection test", keywordsToSearch: ["{REPO_NAME}"], owner: "{GITHUB_ORG}", repo: "{REPO_NAME}", match: "path", limit: 1}])` |
| 7 | Fire Console | `ToolSearch("+fire-console search_services")` | `search_services(query: "test")` |

**Execution:**
1. Use `ToolSearch` with keyword queries (as shown above) to load each tool first
2. Call all 7 checks in parallel (independent calls)
3. Collect results into a status table

**Display status table to user:**
```
=== MCP Connection Status ===
| # | Server          | Status  | Response |
|---|-----------------|---------|----------|
| 1 | Jira            | OK/FAIL | [brief]  |
| 2 | Grafana         | OK/FAIL | [brief]  |
| 3 | Slack           | OK/FAIL | [brief]  |
| 4 | GitHub          | OK/FAIL | [brief]  |
| 5 | Feature Toggles | OK/FAIL | [brief]  |
| 6 | Octocode        | OK/FAIL | [brief]  |
| 7 | Fire Console    | OK/FAIL | [brief]  |
```

**Decision logic:**
- **All 7 OK** -> Proceed to Step 0.4.
- **Any FAIL** -> Tell user EXACTLY which servers failed. Display: "MCP servers not connected: [list]. Please run `/mcp` to reconnect or check server configuration." **STOP and WAIT.** Do not proceed.
- **If user reconnects and says to retry** -> Re-run ALL checks (not just failed ones).
- **If still failing after retry** -> **STOP THE ENTIRE INVESTIGATION.** Do not attempt workarounds or local fallbacks without user approval.

**No exceptions.** All 7 servers must pass. Octocode is NOT optional -- it provides features (semantic code search, cross-repo search) that GitHub MCP and local tools cannot replace.

**Optimization:** Run ALL 7 ToolSearch calls in a single message, then ALL 7 health checks in the next message. Don't interleave ToolSearch with health checks.

---

## MCP Tool Discovery

Use `ToolSearch` with keyword queries (e.g., `ToolSearch("+jira get-issues")`) to discover tools dynamically. Never hardcode full tool names -- the prefix depends on the server key name in the user's config.

---

## Mid-Investigation MCP Failure

If an MCP server fails mid-investigation (after Step 0.3 passed):

1. **Report the failure to the user:** "[MCP server] failed. Error: [error]"
2. **Propose the local alternative:** "I can use [local tool] instead, but it has these limitations: [list]"
3. **Wait for user approval** before proceeding with the fallback
4. If approved: **record the fallback in the agent's trace file** -- which MCP failed, what local tool was used instead, and what limitations this introduces
5. The agent's output file must also note: "Data source: [local tool] (MCP fallback -- [MCP name] was unavailable)"

**NEVER silently fall back to local alternatives.** Examples of forbidden silent fallbacks:
- `gh` CLI instead of GitHub MCP
- Local `git log` instead of GitHub commits
- Glob/Grep instead of Octocode

---

## Agent Failure Handling

### Quality Gate Failures

If an agent's output fails its quality gate (missing required sections, no query results, etc.):

1. **First failure:** Re-launch the agent with specific correction instructions pointing out what's missing.
2. **Second failure:** Note the gap in findings-summary.md and proceed. Do NOT re-launch a third time.

### Agent Crash / No Output

If an agent task completes but produces no output file:
1. Check if the output directory exists
2. Re-launch once with the same parameters
3. If still no output, log the failure and proceed without that agent's data

### Diagnostic Checklist

Before re-launching a failed agent, ask:
- Does it misunderstand the task? -> Restructure the prompt.
- Does it fail on the same MCP call? -> Check skill reference parameters.
- Does it include forbidden content (conclusions, analysis)? -> Re-emphasize "RAW DATA ONLY" rule.
- Did it run out of context? -> Reduce input size by summarizing non-critical reports.

---

## Fresh Start Rules

1. **Never read from previous `debug-*` directories.** Each run creates a new directory under `.claude/debug/` (or `./debug/` outside a repo).
2. **Never reference findings, hypotheses, or conclusions from previous investigation sessions.** Each invocation is a completely independent investigation -- even for the same ticket.
3. **If the user wants to build on a previous investigation,** they must explicitly provide the previous report or findings.
4. **Trace files are NEVER shared** between agents or across investigations. They are for human debugging only.

---

## Fast-Fail Principle

1. **MCP failure = HARD STOP for that operation.** Report the failure, try auth once, then stop if still failing.
2. **Never fabricate data** when a tool fails.
3. **In ad-hoc mode:** If an MCP tool fails, report the error immediately. Don't retry silently.
4. **If an MCP tool or agent fails, report it immediately.** Do not retry silently or fabricate data.

---

## Hypothesis Iteration Limits

- Maximum 5 hypothesis iterations before escalating to the user.
- After reaching the limit: present all findings, show what's proven vs unknown, ask user whether to continue or document with best hypothesis.
- If the same gap persists across 3+ iterations (same checklist item keeps failing), flag this to the user as a potential data limitation.
- See [hypothesis-loop.md](hypothesis-loop.md) for the full iteration pressure model.

---

## Publishing Safety

Before posting ANY message to Slack:
- **NEVER include Slack channel links** without first verifying the channel exists via `slack_find-channel-id`
- **NEVER fabricate channel names.** If you don't know the exact channel, omit the reference
- **Verify ALL hyperlinks** in the message before posting
- **NEVER include local file paths** in published content (`.claude/debug/...`, `/Users/...`, `OUTPUT_DIR`)
- The publisher agent MUST present the FULL formatted message to the user and wait for explicit approval before posting (HARD GATE)
