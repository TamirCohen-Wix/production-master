# Investigation Flow

## Pipeline State Machine

```
INITIALIZING → CONTEXT_GATHERING → LOG_ANALYSIS → CODE_ANALYSIS →
PARALLEL_DATA_FETCH → HYPOTHESIS_GENERATION (includes verification) →
  ├── CONFIRMED → FIX_PLANNING → DOCUMENTING → COMPLETE
  └── DECLINED → [re-gather data] → HYPOTHESIS_GENERATION (loop, max 5)
```

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

    INIT --> MCP_CHECK["Step 0.3: Verify 6 MCP Servers"]
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
        PROD["Production Analyzer"]
        SLACK["Slack Analyzer"]
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

Each full investigation creates a timestamped output directory:

```
.claude/debug/debug-SCHED-45895-2026-02-14-143000/
├── findings-summary.md              ← Persistent state file (updated after every step)
├── report.md                        ← Final investigation report (Step 8)
│
├── bug-context/
│   ├── bug-context-output-V1.md
│   └── bug-context-trace-V1.md      ← Action log (human debugging only)
├── grafana-analyzer/
│   ├── grafana-analyzer-output-V1.md
│   └── grafana-analyzer-output-V2.md ← Re-run after Declined
├── codebase-semantics/
│   ├── codebase-semantics-output-V1.md
│   └── codebase-semantics-prs-output-V1.md
├── production-analyzer/
│   └── production-analyzer-output-V1.md
├── slack-analyzer/
│   └── slack-analyzer-output-V1.md
├── fire-console/
│   └── fire-console-output-V1.md
├── hypotheses/
│   ├── hypotheses-tester-A-output-V1.md
│   └── hypotheses-tester-B-output-V1.md
├── skeptic/
│   └── skeptic-output-V1.md
├── fix-list/
│   └── fix-list-output-V1.md
├── documenter/
│   └── documenter-output-V1.md
└── publisher/
    └── publisher-output-V1.md
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
