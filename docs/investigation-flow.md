# Investigation Flow

## Pipeline State Machine

```
INITIALIZING → CONTEXT_GATHERING → LOG_ANALYSIS → CODE_ANALYSIS →
PARALLEL_DATA_FETCH → HYPOTHESIS_GENERATION (includes verification) →
  ├── CONFIRMED → FIX_PLANNING → DOCUMENTING → COMPLETE
  └── DECLINED → [re-gather data] → HYPOTHESIS_GENERATION (loop, max 5)
```

The flow is shared across all product surfaces (Claude, Cursor, Cloud). Surface adapters can change entrypoint UX, but evidence, hypothesis, verification, and reporting stages remain aligned.

When agent teams are enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), HYPOTHESIS_GENERATION uses parallel competing hypotheses + skeptic cross-examination. Otherwise, sequential hypothesis → verifier loop.

Current state is tracked in `findings-summary.md`.

## Flow Diagram

```mermaid
flowchart TD
    START["/production-master TICKET-ID"] --> CLASSIFY["Step 0: Classify Intent"]
    CLASSIFY --> |FULL_INVESTIGATION| INIT["Step 0.2: Create Output Dir"]
    CLASSIFY --> |QUERY_LOGS| DIRECT_GRAFANA["Direct Grafana Query"]
    CLASSIFY --> |TRACE_REQUEST| DIRECT_TRACE["Direct Request Trace"]
    CLASSIFY --> |Other modes| DIRECT_OTHER["Direct Execution"]

    INIT --> MCP_CHECK["Step 0.3: Verify Required MCP Providers"]
    MCP_CHECK --> |All OK| JIRA["Step 0.4: Fetch Jira Ticket"]
    MCP_CHECK --> |Any FAIL| STOP["STOP — Fix MCP"]

    JIRA --> SKILLS["Step 0.5: Load Skill Files"]
    SKILLS --> BUG_CTX["Step 1: Bug Context"]
    BUG_CTX --> ENRICH["Step 1.3: Fire Console Enrichment"]
    ENRICH --> VALIDATE["Step 1.5: Validate Artifact IDs"]
    VALIDATE --> GRAFANA["Step 2: Grafana Analyzer"]
    GRAFANA --> LOCAL["Step 2.5: Find Local Code"]
    LOCAL --> CODEBASE["Step 3: Codebase Semantics"]

    CODEBASE --> PARALLEL["Step 4: Parallel Data Fetch"]

    subgraph PARALLEL_BOX ["Parallel Execution"]
        PROD["Change Analyzer"]
        SLACK["Comms Analyzer"]
        CODE_PRS["Codebase PRs"]
        FC["Fire Console Deep Enrichment"]
    end
    PARALLEL --> PROD & SLACK & CODE_PRS & FC

    PROD & SLACK & CODE_PRS & FC --> RECOVERY["Step 4.5: Recovery Window"]
    RECOVERY --> HYPOTHESIS["Step 5: Hypothesis Generation"]

    subgraph HYPO_BOX ["Hypothesis Phase"]
        direction TB
        HYPO_A["Tester A: Theory A"]
        HYPO_B["Tester B: Theory B"]
        SKEPTIC_V["Skeptic: Cross-examine"]
        HYPO_A & HYPO_B --> SKEPTIC_V
    end
    HYPOTHESIS --> HYPO_A & HYPO_B

    SKEPTIC_V --> DECISION{"Step 6: Verdict?"}
    DECISION --> |CONFIRMED| FIX["Step 7: Fix List"]
    DECISION --> |DECLINED| REGATHER["Re-gather Evidence"]
    REGATHER --> |"max 5 iterations"| HYPOTHESIS

    FIX --> DOC["Step 8: Documenter → report.md"]
    DOC --> PUB{"Step 9: Publish?"}
    PUB --> |Yes| PUBLISHER["Publisher → Jira/Slack"]
    PUB --> |No| DONE["COMPLETE"]
    PUBLISHER --> DONE
```

## Critical Investigation Principles

### 1. Always Inspect Error Data Payloads
The `data` column in Grafana app_logs contains structured JSON with the actual request/entity state that caused the error. The Grafana analyzer MUST query and parse this for every error type. Common findings: empty fields, contradictory combinations (e.g., `resource: empty` with `selection_method: SPECIFIC_RESOURCE`).

### 2. FT Rollout vs FT Merge — Know the Difference
Feature toggle merge PRs typically happen after the FT has been at 100% for a long time — they clean up dead code. When investigating FTs, check the *rollout date* (when behavior changed for users) not just the merge date. The rollout can be a root cause; the merge usually isn't, though cleanup bugs are possible.

### 3. Investigate Configuration, Not Just Code
Site settings, user configurations, pricing plans, and resource settings can all cause production bugs. Always check for configuration changes alongside code changes.

### 4. Agent Directories Are Created On-Write
Agent subdirectories are NOT pre-created. Each agent creates its own when writing output. This shows which agents actually ran.

### 5. Each Run Is Completely Fresh
Never read from previous `debug-*` directories. Never reference previous investigation findings unless the user explicitly provides them.

## Hypothesis Verification Loop

The hypothesis loop is the core quality mechanism:

1. **Generate** — Create a hypothesis from all collected data
2. **Verify** — Apply 5-point checklist (pinpoint explanation, why started, still in code, why stopped, evidence completeness)
3. **Decide** — All 5 pass → Confirmed. Any fail → Declined with specific evidence gaps
4. **Re-gather** — Run targeted queries from the verifier's evidence gaps
5. **Iterate** — Generate new hypothesis with additional data (max 5 iterations)

### Agent Team Mode (Recommended)

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set:

1. Orchestrator generates 2 candidate theories (A and B)
2. Two hypothesis-tester agents investigate in parallel
3. Skeptic agent cross-examines both and produces a verdict
4. If neither passes, orchestrator re-gathers evidence and iterates

### Sequential Mode (Fallback)

When agent teams are disabled:

1. Single hypothesis agent generates a theory
2. Verifier evaluates against the 5-point checklist
3. If declined, orchestrator re-gathers and iterates

## Output Directory Structure

Each full investigation creates a timestamped output directory. Agent subdirectories are created by agents when they write output (NOT pre-created), so the directory structure shows exactly which agents ran:

```
.claude/debug/debug-SCHED-45895-2026-02-14-143000/
├── findings-summary.md              ← Persistent state file (updated after every step)
├── report.md                        ← Final investigation report (Step 8)
│
├── bug-context/                     ← Created by bug-context agent
│   ├── bug-context-output-V1.md
│   └── bug-context-trace-V1.md      ← Action log (human debugging only)
├── log-analyzer/                    ← Created by log-analyzer agent
│   ├── log-analyzer-output-V1.md
│   └── log-analyzer-output-V2.md    ← Re-run after Declined
├── codebase-semantics/              ← Created by codebase-semantics agent
│   ├── codebase-semantics-output-V1.md
│   └── codebase-semantics-prs-output-V1.md
├── change-analyzer/                 ← Only exists if change-analyzer ran
│   └── change-analyzer-output-V1.md
├── comms-analyzer/                  ← Only exists if comms-analyzer ran
│   └── comms-analyzer-output-V1.md
...
```

### File Naming

- **Output:** `{agent-name}-output-V{N}.md` — clean data passed between agents
- **Trace:** `{agent-name}-trace-V{N}.md` — input + action log for human debugging only
- N increments per re-invocation of the same agent

### Location

- Inside a git repo: `.claude/debug/`
- Outside a git repo: `./debug/`

### Key Files

- **`findings-summary.md`** — Persistent state file updated after every step. Contains: incident window, services, top errors, checklist status, what's proven, what's missing, agent invocation log.
- **`report.md`** — Final investigation report generated by the documenter agent.
