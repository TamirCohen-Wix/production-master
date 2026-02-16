# Cursor: single agent — no Task tool. When this doc says "Launch Task with agent X", read .cursor/agents/X.md and execute those instructions yourself in this turn; write output to the path specified. Use .cursor/skills/<name>/SKILL.md for MCP tool names and parameters.

# Production Master Debug — Pipeline Improvement Command

You analyze a previous Production Master investigation run, identify pipeline issues, and suggest concrete improvements.

---

## Process

### Step 1: Understand the problem
Parse `$ARGUMENTS` for the user's description of what went wrong with a previous investigation.

### Step 2: Locate debug directory
Find the most recent debug directory:
```bash
ls -dt .claude/debug/debug-* 2>/dev/null | head -1
```
If not found, try:
```bash
ls -dt ~/.claude/debug/debug-* debug/debug-* 2>/dev/null | head -1
```
If still not found, ask the user for the path.

Store as `DEBUG_DIR`.

### Step 3: Read ALL trace and output files
Read every file in the debug directory:
- All `*-trace-V*.md` files (agent execution traces)
- All `*-output-V*.md` files (agent outputs)
- `findings-summary.md` (pipeline state)
- `report.md` (final report, if exists)

### Step 4: Analyze pipeline issues

Examine the traces and outputs for:

1. **Underperforming agents** — agents that produced incomplete or low-quality output
2. **MCP failures** — tools that failed, timed out, or returned unexpected results
3. **Bad classifications** — incorrect intent classification or artifact resolution
4. **Hypothesis loop inefficiencies** — repeated theories, missed evidence, unnecessary iterations
5. **Data gaps** — missing data that could have been fetched but wasn't
6. **Formatting issues** — broken links, wrong markup, timezone errors
7. **Prompt issues** — agent instructions that led to wrong behavior

### Step 5: Generate improvement suggestions

For each issue found, produce a specific suggestion:

```markdown
## Issue: [short title]
**Agent:** [which agent]
**File:** [which file to modify]
**Section:** [which section]
**Problem:** [what went wrong]
**Suggested change:** [exact change to make]
**Priority:** HIGH / MEDIUM / LOW
```

### Step 6: Apply changes

1. Create a new branch: `git checkout -b fix/pipeline-improvements-$(date +%Y%m%d)`
2. Apply the suggested changes to agent/command files
3. Commit with a descriptive message
4. Open a PR via `gh pr create`

### Step 7: Send debug directory to author

1. Zip the debug directory:
   ```bash
   zip -r /tmp/debug-archive.zip {DEBUG_DIR}
   ```
2. Find the user ID for `tamirc@wix.com`:
   ```
   ToolSearch("+slack slack_find-user-id-by-email")
   slack_find-user-id-by-email(email: "tamirc@wix.com")
   ```
3. Send a Slack DM with the debug directory path:
   ```
   ToolSearch("+slack slack_post_message")
   slack_post_message(channel: "<USER_ID>", text: "Production Master debug archive from a pipeline improvement run:\n\nPath: {DEBUG_DIR}\nZip: /tmp/debug-archive.zip\n\nIssues found: [count]\nPR: [PR URL]")
   ```

### Step 8: Present summary

Show the user:
- Number of issues found
- Changes applied (files modified)
- PR link
- Whether Slack notification was sent
