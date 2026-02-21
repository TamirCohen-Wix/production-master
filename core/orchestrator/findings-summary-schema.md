# Findings Summary Schema

Extracted from `commands/production-master.md`. This module defines the persistent state file (`findings-summary.md`) that is updated after every phase of the investigation.

> Cross-references: Phase transitions in [state-machine.md](state-machine.md). Agent dispatch context in [agent-dispatch.md](agent-dispatch.md). Hypothesis loop updates in [hypothesis-loop.md](hypothesis-loop.md).

---

## Purpose

`findings-summary.md` is the persistent state file for the entire investigation. It lives at `{OUTPUT_DIR}/findings-summary.md` and serves as:

1. **State tracker** -- records the current pipeline state
2. **Evidence ledger** -- tracks what's proven and what's missing
3. **Checklist status** -- the 5-point verification checklist
4. **Agent log** -- which agents ran, with what model, and their key outputs
5. **Next tasks** -- what the verifier/skeptic wants investigated next

---

## Initial Template (Created after Phase 2: Grafana Log Analysis)

```markdown
# Findings Summary

## State: LOG_ANALYSIS complete

## Incident Window
- Estimated: [from bug-context]
- Exact start: [from Grafana or "unknown"]
- Exact end: [from Grafana or "unknown"]

## Services (artifact_ids)
[from Grafana errors]

## Top Errors from Grafana
[one-line per error]

## Checklist Status
1. Logs: [Pass/Unknown]
2. Pinpoint explanation: Unknown
3. Why started: Unknown
4. If still in code: Unknown
5. Why stopped: Unknown

## What's Proven
[facts from Grafana]

## What's Missing
[everything else]

## Per-Agent Next Task
(none yet)

## Agent Invocation Log
| Step | Agent | Model | Status | Key Output |
|------|-------|-------|--------|------------|
| 1 | bug-context | sonnet | done | [services, time window] |
| 2 | grafana-analyzer | sonnet | done | [error count, boundaries] |
```

---

## Update Rules

### When to Update

Update findings-summary.md after EVERY phase:

| After Phase | Update With |
|-------------|------------|
| Phase 2 (Grafana) | Initial creation (template above) |
| Phase 3 (Codebase) | Services, flow names, key code locations |
| Phase 4 (Parallel Fetch) | Exact times, repo changes, Slack findings |
| Phase 4.5 (Recovery) | Recovery window evidence |
| Phase 5 (Hypothesis) | Hypothesis summary, checklist updates |
| Phase 6 (Decision - DECLINED) | State: `DECLINED_ITERATION_{N}`, checklist status, gaps, next tasks |
| Phase 6 (Decision - CONFIRMED) | State: `CONFIRMED`, final checklist, confidence |
| Re-gather (between iterations) | Targeted Grafana results, new agent data |

### What to Include in Each Update

1. **State line** -- Always update `## State:` to reflect the current pipeline state
2. **Checklist status** -- Update Pass/Fail/Unknown for each of the 5 items
3. **What's Proven** -- Add new facts with citations (file:line, Grafana query, PR link)
4. **What's Missing** -- Remove items that are now proven, add newly identified gaps
5. **Per-Agent Next Task** -- From verifier/skeptic verdict when DECLINED
6. **Agent Invocation Log** -- Add a row for each agent that ran

---

## The 5-Point Checklist

The checklist tracks verification status for the root cause hypothesis:

| # | Item | Description |
|---|------|-------------|
| 1 | **Logs** | Are log entries found that confirm the error? |
| 2 | **Pinpoint explanation** | Is the exact mechanism identified (file:line, code path, condition)? |
| 3 | **Why started** | Is there a clear trigger (PR, FT rollout, config change, deploy) with a timeline match? |
| 4 | **If still in code** | Is the vulnerable code still present, or has it been fixed? |
| 5 | **Why stopped** | Is there an explanation for why the issue resolved (if it did)? |

**ALL 5 must Pass for a hypothesis to be CONFIRMED. Any Fail = DECLINED.**

---

## State Values

The `## State:` line uses these values:

| State | Meaning |
|-------|---------|
| `INITIALIZING` | Step 0: MCP checks, Jira fetch, skill loading |
| `CONTEXT_GATHERING` | Phase 1: Parsing Jira ticket |
| `DATA_ENRICHMENT` | Phase 1.3: Fire Console enrichment |
| `ARTIFACT_VALIDATION` | Phase 1.5: Validating artifact IDs |
| `LOG_ANALYSIS` | Phase 2: Grafana log analysis |
| `LOCAL_CODE_DISCOVERY` | Phase 2.5: Finding local repo clones |
| `CODE_ANALYSIS` | Phase 3: Codebase error propagation |
| `PARALLEL_DATA_FETCH` | Phase 4: Production, Slack, PRs, Fire Console |
| `RECOVERY_ANALYSIS` | Phase 4.5: Recovery window analysis |
| `HYPOTHESIS_GENERATION` | Phase 5: Generating and testing hypotheses |
| `VERIFICATION` | Phase 6: Decision point |
| `CALLER_ANALYSIS` | Phase 6.5: Access log caller analysis |
| `FIX_PLANNING` | Phase 7: Fix list generation |
| `DOCUMENTING` | Phase 8: Report generation |
| `PUBLISHING` | Phase 9: Publishing to Jira/Slack |
| `COMPLETE` | Investigation finished |
| `DECLINED_ITERATION_{N}` | Hypothesis #{N} was declined, re-gathering data |

---

## DECLINED Iteration Update Pattern

When a hypothesis is DECLINED, the findings-summary update must include:

```markdown
## State: DECLINED_ITERATION_{HYPOTHESIS_INDEX}

## Checklist Status
1. Logs: [Pass/Fail]
2. Pinpoint explanation: [Pass/Fail]
3. Why started: [Pass/Fail]
4. If still in code: [Pass/Fail]
5. Why stopped: [Pass/Fail]

## What's Proven
[accumulated facts from all iterations]

## What's Missing
[specific gaps identified by verifier/skeptic]

## Per-Agent Next Task
[from verdict's "Next Tasks" section -- exact agent names and their tailored tasks]

## Targeted Grafana Results (if any inline queries were run)
[results from SQL queries provided by the verifier/skeptic]
```

---

## Confidence Floor Tracking

If confidence >= 70% but not all 5 checklist items pass:
- Note in findings-summary: "High confidence, incomplete proof"
- If this is the 3rd+ iteration with similar confidence, consider presenting to user
- Track confidence across iterations to detect plateau patterns
