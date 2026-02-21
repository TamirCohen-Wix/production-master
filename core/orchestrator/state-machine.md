# State Machine

Extracted from `commands/production-master.md` MODE: FULL_INVESTIGATION. This module defines the multi-phase investigation pipeline, phase transitions, and the findings-summary update pattern.

> Cross-references: Intent classification in [intent-classifier.md](intent-classifier.md). Hypothesis loop details in [hypothesis-loop.md](hypothesis-loop.md). Agent dispatch rules in [agent-dispatch.md](agent-dispatch.md). Findings-summary format in [findings-summary-schema.md](findings-summary-schema.md). Error handling in [recovery-protocol.md](recovery-protocol.md).

---

## State Transitions

The investigation progresses through these explicit states:

```
INITIALIZING -> CONTEXT_GATHERING -> DATA_ENRICHMENT -> ARTIFACT_VALIDATION ->
LOG_ANALYSIS -> LOCAL_CODE_DISCOVERY -> CODE_ANALYSIS ->
PARALLEL_DATA_FETCH -> (RECOVERY_ANALYSIS) ->
HYPOTHESIS_GENERATION (includes verification) ->
  +-- CONFIRMED -> CALLER_ANALYSIS (conditional) -> FIX_PLANNING -> DOCUMENTING -> PUBLISHING -> COMPLETE
  +-- DECLINED -> [re-gather data] -> HYPOTHESIS_GENERATION (loop, max 5)

Note: When agent teams are enabled (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1),
HYPOTHESIS_GENERATION uses parallel competing hypotheses + skeptic cross-examination.
Otherwise, sequential hypothesis -> verifier loop.
```

Current state is tracked in `findings-summary.md`.

---

## Phase Markers (User Visibility)

Print visible phase markers between major steps so the user can track pipeline progress:

```
=== Phase 0/9: Initialization (MCP checks, Jira fetch, skill loading) ===
=== Phase 1/9: Bug Context ===
=== Phase 2/9: Grafana Log Analysis ===
=== Phase 3/9: Codebase Error Propagation ===
=== Phase 4/9: Parallel Data Fetch (Production, Slack, PRs, Fire Console) ===
=== Phase 5/9: Hypothesis Generation & Verification ===
=== Phase 6/9: Decision Point ===
=== Phase 7/9: Fix Planning ===
=== Phase 8/9: Documentation ===
=== Phase 9/9: Publishing ===
```

Print each marker as plain text output BEFORE starting that phase's work. This gives the user immediate feedback about pipeline progress.

---

## Phase Details

### Phase 0: Initialization (`INITIALIZING`)

Status: `echo "Phase 0/9: Initialization" > /tmp/.production-master-status`

Sub-steps executed sequentially:
1. **Step 0.1:** Classify user intent (see [intent-classifier.md](intent-classifier.md))
2. **Step 0.1.5:** Load domain config (see [intent-classifier.md](intent-classifier.md))
3. **Step 0.2:** Create output directory
4. **Step 0.3:** Verify ALL 7 MCP connections (HARD GATE -- see [recovery-protocol.md](recovery-protocol.md))
5. **Step 0.4:** Fetch Jira ticket via MCP `get-issues` with JQL `key = {TICKET_ID}`
6. **Step 0.5:** Load ALL skill files upfront (see [agent-dispatch.md](agent-dispatch.md))

#### Step 0.2: Create Output Directory

**Determine location:**
1. Check if running inside a git repo: `git rev-parse --show-toplevel 2>/dev/null`
2. If yes -> `REPO_ROOT/.claude/debug/`
3. If no -> `./debug/`

**Determine task slug:**
1. If a Jira ticket ID was found (e.g., `SCHED-4353`) -> use it as the slug
2. If no ticket ID -> generate a short slug (2-4 words, kebab-case) summarizing the task

**Create directory:**
```bash
date "+%Y-%m-%d-%H%M%S"
```
Create: `{DEBUG_ROOT}/debug-{TASK_SLUG}-{timestamp}/` and store as `OUTPUT_DIR`.

**Agent subdirectories:** Do NOT pre-create agent subdirectories. Each agent creates its own subdirectory when it writes output (via `mkdir -p` in its write step).

**Initialize agent invocation counters:**
```
AGENT_COUNTERS = {bug-context: 0, grafana-analyzer: 0, codebase-semantics: 0, codebase-semantics-prs: 0, production-analyzer: 0, slack-analyzer: 0, fire-console: 0, hypotheses: 0, verifier: 0, skeptic: 0, fix-list: 0, documenter: 0, publisher: 0}
```
Increment the relevant counter BEFORE each agent launch. The counter value becomes the `V{N}` suffix in the output filename.

**Output file naming convention:**
```
{OUTPUT_DIR}/{agent-name}/{agent-name}-output-V{N}.md   -- clean data for pipeline
{OUTPUT_DIR}/{agent-name}/{agent-name}-trace-V{N}.md    -- input + action trace (human only)
```

`findings-summary.md` and `report.md` stay at `{OUTPUT_DIR}/` root.

**Trace files are NEVER passed to other agents.** They exist solely for the human operator to debug the pipeline.

---

### Phase 1: Bug Context (`CONTEXT_GATHERING`)

Status: `echo "Phase 1/9: Bug Context" > /tmp/.production-master-status`

**PERFORMANCE NOTE:** Bug-context is a simple parsing task (no MCP tools needed). For speed, the orchestrator SHOULD parse the Jira data inline rather than launching a separate agent -- this saves ~30-60s. Only launch the bug-context agent if the ticket is very complex (>10 comments, multiple linked issues).

- **Inline approach (preferred):** Parse JIRA_DATA directly following the `agents/bug-context.md` output format. Extract: identifiers, timestamps, services, error messages. Write to `{OUTPUT_DIR}/bug-context/bug-context-output-V1.md`.
- **Agent approach (complex tickets only):** Launch bug-context agent (model: haiku).

**Quality gate:** Verify bug-context has: services, time window, identifiers. If missing critical data, ask user before proceeding.

Store output as `BUG_CONTEXT_REPORT`.

---

### Phase 1.3: Data Enrichment via Fire Console (`DATA_ENRICHMENT`)

Status: `echo "Phase 1.3/9: Data Enrichment" > /tmp/.production-master-status`

Use Fire Console to fetch full domain objects when bug-context only has partial identifiers (MSID, bookingID, orderID, serviceID, etc.). This enriches the investigation context BEFORE log analysis.

**When to run:** If bug-context contains any identifiable domain objects.
**When to skip:** If bug-context has NO domain-specific identifiers (pure infrastructure issue).
**Execution:** Inline -- no agent needed. Uses `find_site`, `invoke_rpc`, `search_services` tools.

Store results as `ENRICHED_CONTEXT`. Pass to ALL subsequent agents. If any Fire Console query fails, log the failure but do NOT block the pipeline.

---

### Phase 1.5: Artifact Validation (`ARTIFACT_VALIDATION`)

Status: `echo "Phase 1.5/9: Artifact Validation" > /tmp/.production-master-status`

For each artifact_id from bug-context, run a quick Grafana count query directly (no agent needed). Validate artifacts exist in logs, try variations if count=0, remove non-existent artifacts.

If multiple ambiguous artifacts found, launch `agents/artifact-resolver.md` (model: sonnet).

---

### Phase 2: Grafana Log Analysis (`LOG_ANALYSIS`)

Status: `echo "Phase 2/9: Grafana Logs" > /tmp/.production-master-status`

Launch grafana-analyzer agent (model: sonnet). Pass: BUG_CONTEXT_REPORT, ENRICHED_CONTEXT, GRAFANA_SKILL.

**Quality gate:** At least one query executed, AppAnalytics URLs present, request_ids captured if errors found, error `data` payloads inspected.

**After completion:** Create initial `findings-summary.md` (see [findings-summary-schema.md](findings-summary-schema.md)).

Store output as `GRAFANA_REPORT`.

---

### Phase 2.5: Local Code Discovery (`LOCAL_CODE_DISCOVERY`)

Status: `echo "Phase 2.5/9: Local Code Discovery" > /tmp/.production-master-status`

Run locally (no MCP needed) to find local repo clones:
```bash
find /Users -maxdepth 4 -name "{REPO_NAME}" -type d 2>/dev/null | head -5
```
Also check specific paths: `~/.claude-worktrees/{REPO_NAME}`, `~/IdeaProjects/{REPO_NAME}`, `~/Projects/*/{REPO_NAME}`.

Store as `LOCAL_REPO_PATH` (or null if not found).

---

### Phase 3: Codebase Error Propagation (`CODE_ANALYSIS`)

Status: `echo "Phase 3/9: Codebase Analysis" > /tmp/.production-master-status`

Launch codebase-semantics agent (model: sonnet). Uses Report Type A: error propagation from Grafana errors.

**Quality gate:** Error propagation table present, file:line references (not vague descriptions), services list with artifact_ids.

Store output as `CODEBASE_SEMANTICS_REPORT`. Update findings-summary.md.

---

### Phase 4: Parallel Data Fetch (`PARALLEL_DATA_FETCH`)

Status: `echo "Phase 4/9: Parallel Data Fetch" > /tmp/.production-master-status`

Launch **up to FOUR Tasks in the SAME message** (true parallel execution, all sonnet):
1. **Production Analyzer** -- PRs, commits, feature toggles, config changes
2. **Slack Analyzer** -- Slack discussions (skip if `--skip-slack` flag)
3. **Codebase Semantics (PRs/Changes)** -- Report Type B: repo changes explaining incident timing
4. **Fire Console Deep Enrichment** -- conditional: only if new identifiers found in Steps 2-3

**Quality gates (check each):**
- Production: Has PR table? Has timeline? Has toggle check?
- Slack: Has search results? All threads have replies fetched?
- Codebase Step 4: Has PR analysis? Has "why started/ended" section?
- Fire Console (if ran): Has fetched objects? Any RPC failures noted?

For failed quality gates: note what's missing in findings-summary, but proceed. Update findings-summary.md.

---

### Phase 4.5: Recovery Window Analysis (`RECOVERY_ANALYSIS`)

Status: `echo "Phase 4.5/9: Recovery Analysis" > /tmp/.production-master-status`

If the incident has a known resolution time: query Grafana for all logs around resolution, search Slack for deployments/config changes. Store as `RECOVERY_EVIDENCE`.

If no resolution time known, skip.

---

### Phase 5: Hypothesis Generation & Verification (`HYPOTHESIS_GENERATION`)

Status: `echo "Phase 5/9: Hypothesis Generation" > /tmp/.production-master-status`

See [hypothesis-loop.md](hypothesis-loop.md) for the full hypothesis-verification cycle.

---

### Phase 6: Decision Point (`VERIFICATION`)

Status: `echo "Phase 6/9: Verification" > /tmp/.production-master-status`

See [hypothesis-loop.md](hypothesis-loop.md) for decision logic.

---

### Phase 6.5: Access Log Caller Analysis (`CALLER_ANALYSIS`)

**When to run:** If the confirmed hypothesis involves security vulnerability, permission/authorization issues, API endpoint behavior changes affecting external callers, or rate limiting/access control changes.
**When to skip:** Pure backend logic bugs, internal service errors, data corruption without API exposure.

Execution is inline (no agent needed). Queries Grafana access logs to map callers. Stores as `ACCESS_LOG_REPORT` and passes to fix-list agent.

---

### Phase 7: Fix Planning (`FIX_PLANNING`)

Status: `echo "Phase 7/9: Fix Planning" > /tmp/.production-master-status`

Launch fix-list agent (model: sonnet). Only runs when hypothesis is CONFIRMED.

Store output as `FIX_PLAN_REPORT`.

---

### Phase 8: Documentation (`DOCUMENTING`)

Status: `echo "Phase 8/9: Documenting" > /tmp/.production-master-status`

Launch documenter agent (model: haiku). Writes `report.md` to `{OUTPUT_DIR}/report.md`.

Note: The `validate-report-links` hook runs automatically after report.md is written.

---

### Phase 9: Publishing (`PUBLISHING`)

Status: `echo "Phase 9/9: Publishing" > /tmp/.production-master-status`

Offer to publish findings to Jira and/or Slack. Always delegate to publisher agent (model: haiku). Show draft to user before posting (MANDATORY).

If the user provides a Slack thread URL:
- Extract channel ID from the URL path
- Extract thread timestamp from the URL (convert `p...` format to decimal)
- Set `SLACK_THREAD_TS` and `MESSAGE_TYPE` to `"follow_up"`

---

### COMPLETE

Clean up status: `rm -f /tmp/.production-master-status`

Present final documentation:
```
Investigation complete.
Report: {OUTPUT_DIR}/report.md
Hypothesis iterations: {HYPOTHESIS_INDEX}
Verdict: Confirmed (confidence: X%)
Root cause: [one sentence from verifier TL;DR]
Published to: [Jira / Slack / both / local only]
```
