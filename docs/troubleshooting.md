# Troubleshooting

## Surface-Aware Checks

Production Master supports Claude, Cursor, and Cloud surfaces. Start by confirming where the failure occurs:

- `adapter-claude/` (CLI/plugin command flow)
- `adapter-cursor/` (Cursor integration flow)
- `adapter-cloud/` (API/worker flow)

If a failure appears on only one surface, inspect adapter-specific config first. If it appears on all surfaces, inspect `core/` behavior and MCP/provider health.

## MCP Server Issues

### "MCP servers not connected"

The plugin uses 9 MCP servers total. Full investigations check 7 of them at Step 0.3 before proceeding:

1. Check MCP/server status in your active surface runtime
2. Reconnect failed servers or refresh credentials
3. Re-run the investigation entrypoint for that surface

### MCP Servers

| Server | What It Provides | Checked at Step 0.3 |
|--------|-----------------|---------------------|
| Jira | Ticket data, comments | Yes |
| Grafana Datasource | App logs, access logs, PromQL/LogQL | Yes |
| Grafana MCP | Dashboards, alerts, incidents, Sift | No (used on-demand) |
| Slack | Channel search, threads, posting | Yes |
| GitHub | PRs, commits, code search | Yes |
| Octocode | Semantic code search, repo structure | Yes |
| FT-release | Feature toggle status, releases | Yes |
| Fire Console | gRPC domain objects (bookings, services, events) | Yes |
| Context7 | Library documentation lookup | No (used on-demand) |

### MCP Server Fails Mid-Investigation

If a server fails after Step 0.3 passed:
- The pipeline will NOT silently fall back to local tools
- It will report the failure and propose alternatives
- You must approve any fallback before it proceeds

### Surface-Specific Fails, Shared Core Works

If only one adapter fails while others work:
1. Verify adapter-specific environment variables and config files
2. Verify adapter command/hook/webhook wiring
3. Compare with the working surface to isolate integration drift

## Common Problems

### "No domain.json found"

**Cause:** No domain config exists for the current repo.

**Fix:** Run `/update-context` to create one interactively. The pipeline still works without it, but you'll need to provide artifact IDs manually.

### "Artifact not found in Grafana"

**Cause:** The service name doesn't match any `artifact_id` in Grafana logs.

**Fixes:**
1. Use `/resolve-artifact <name>` to find the correct artifact ID
2. Check if the name needs the artifact prefix (e.g., `bookings-service` → `{ARTIFACT_PREFIX}.bookings-service`)
3. Use a LIKE search: the pipeline tries `%<name>%` automatically

### Agent Returns Incomplete Output

The pipeline has quality gates for each agent. If an agent's output is incomplete:

1. It will be re-launched once with specific correction instructions
2. If it fails again, the gap is noted and the pipeline continues
3. Check the agent's trace file (`-trace-V*.md`) for debugging

### Hypothesis Loop Reaches Max Iterations (5)

**Cause:** The available evidence is insufficient to fully prove any theory.

**What happens:**
1. All findings are presented to you
2. You're shown what's proven vs. unknown
3. You choose: continue investigating or document with the best hypothesis

**Common reasons:**
- Missing logs (data retention expired)
- Infrastructure-level issue beyond service logs
- Intermittent problem that stopped on its own

### Empty Grafana Query Results

**Cause:** Wrong artifact ID, wrong time range, or no logs in that window.

**Fixes:**
1. Verify the artifact ID with `/resolve-artifact`
2. Check the time range — Grafana app_logs have limited retention
3. Try broadening the search: remove level filters, expand the time window

### "Unauthorized" or "Permission Denied" from Fire Console

**Cause:** Missing `meta-site-id` in the aspects, or insufficient permissions.

**Fixes:**
1. Ensure you're providing an MSID with the query
2. Some APIs require impersonation — provide both `userId` and `metaSiteId`
3. Server-to-server calls need explicit identity context

## FAQ

### Can I use Production Master outside a git repo?

Yes. The output directory will be `./debug/` instead of `.claude/debug/`. Domain config detection falls back to `~/.claude/domain.json`.

### Do I need all 9 MCP servers for standalone commands?

No. Standalone commands (`/grafana-query`, `/slack-search`, etc.) only need their specific MCP server. The 7-server pre-flight check is only for full investigations. The remaining 2 servers (Grafana MCP, Context7) are used on-demand during the pipeline.

### Can I run multiple investigations simultaneously?

Each investigation creates a separate timestamped output directory, so they don't interfere. However, MCP tool calls are sequential within a conversation.

### How do I contribute a domain config for my team?

Run `/update-context` and say "yes" when it offers to open a PR. The config will be placed in `Domain/<Division>/<Side>/<repo>/` following the repository convention.

### What's the difference between agent teams and sequential mode?

- **Agent teams** (recommended): Two hypothesis testers compete, then a skeptic cross-examines. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- **Sequential mode**: One hypothesis → one verifier → loop. Works without the experimental flag.

### Why does the pipeline not retry on empty results?

By design. Empty results are valid data — they tell you the service isn't logging errors, the request didn't reach that service, etc. Query expansion risks returning irrelevant results and misleading the investigation.
