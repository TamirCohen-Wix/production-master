# Hypothesis Loop

Extracted from `commands/production-master.md` STEP 5, STEP 5A, STEP 5B, and STEP 6. This module defines the hypothesis-verification cycle including generation, verification, decision logic, and iteration.

> Cross-references: Phase context in [state-machine.md](state-machine.md). Agent dispatch rules in [agent-dispatch.md](agent-dispatch.md). Findings-summary updates in [findings-summary-schema.md](findings-summary-schema.md). MCP failure handling in [recovery-protocol.md](recovery-protocol.md).

---

## Overview

The hypothesis loop is the core reasoning engine. It generates a theory of root cause, verifies it against a 5-point checklist, and either confirms or declines. On decline, it re-gathers targeted evidence and iterates. Maximum 5 iterations before escalating to the user.

Maintain counter `HYPOTHESIS_INDEX` (start at 1).

---

## Execution Mode Selection

```
IF environment variable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS == "1":
  -> Use STEP 5A (Agent Team -- competing hypotheses)
ELSE:
  -> Use STEP 5B (Sequential subagent -- legacy fallback)
```

---

## STEP 5A: Agent Team -- Competing Hypotheses (PREFERRED)

**Prerequisites:** All data reports from Phases 1-4.5 are available.

### 5A.1: Generate Candidate Hypotheses (Lead does this inline)

Analyze `findings-summary.md` and all data reports. Generate exactly 2 candidate theories:

- **Theory A:** The most likely root cause based on the strongest evidence
- **Theory B:** An alternative root cause that explains the same symptoms differently

For each theory, write a 2-3 sentence description including:
- What the theory claims
- What evidence supports it
- What specific queries/searches would prove or disprove it

### 5A.2: Create Investigation Team

Read agent prompts from `agents/hypotheses.md` and `agents/skeptic.md`.

Increment `AGENT_COUNTERS[hypotheses]` TWICE (once for A, once for B).

Launch an agent team with 3 teammates using `Task` with `mode: "delegate"`. All teammates use `model: "sonnet"`.

**Teammate 1 -- hypothesis-tester-A:**
```
Name: "hypothesis-tester-A"
Prompt: [full content of hypotheses.md agent prompt]
  + BUG_CONTEXT_REPORT: [full content]
  + ENRICHED_CONTEXT: [full content -- domain objects from Fire Console]
  + CODEBASE_SEMANTICS_REPORT: [full content]
  + GRAFANA_REPORT: [full content]
  + PRODUCTION_REPORT: [full content]
  + CODEBASE_SEMANTICS_STEP4_REPORT: [full content]
  + SLACK_REPORT: [full content]
  + FINDINGS_SUMMARY: [full content of findings-summary.md]
  + RECOVERY_EVIDENCE: [full content from Step 4.5, or "No recovery window data"]
  + FIRE_CONSOLE_SKILL_REFERENCE: [full content of FIRE_CONSOLE_SKILL]
  + [If iterating: ALL previous hypothesis files with their Skeptic decisions]

  THEORY: "[Theory A description -- what to test, what evidence to look for]"

  You are running in Mode 2 (teammate). You CAN run Grafana queries, search code, check
  feature toggles, and query Fire Console (invoke_rpc) to gather ADDITIONAL evidence for your theory.
  Use Fire Console when you need to inspect specific domain objects (bookings, services, events, policies)
  to verify your theory.

  This is hypothesis iteration #{HYPOTHESIS_INDEX} of max 5.
  [If HYPOTHESIS_INDEX >= 3: "Warning: Iteration {HYPOTHESIS_INDEX}/5 -- focus on the strongest remaining theory."]
  [If HYPOTHESIS_INDEX >= 4: "Warning: Iteration {HYPOTHESIS_INDEX}/5 -- nearing limit. Prioritize strongest evidence."]
  [If iterating: "Previous hypotheses were Declined. The skeptic identified these gaps: [gaps].
  You MUST address these specific gaps."]

  OUTPUT_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-tester-A-output-V{N}.md
  TRACE_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-tester-A-trace-V{N}.md
```

**Teammate 2 -- hypothesis-tester-B:**
```
Name: "hypothesis-tester-B"
Prompt: [full content of hypotheses.md agent prompt]
  + [Same data reports as Teammate 1, including ENRICHED_CONTEXT and FIRE_CONSOLE_SKILL_REFERENCE]

  THEORY: "[Theory B description -- what to test, what evidence to look for]"

  You are running in Mode 2 (teammate). You CAN run Grafana queries, search code, check
  feature toggles, and query Fire Console (invoke_rpc) to gather ADDITIONAL evidence for your theory.

  This is hypothesis iteration #{HYPOTHESIS_INDEX} of max 5.
  [Same iteration warnings as Teammate 1]

  OUTPUT_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-tester-B-output-V{N}.md
  TRACE_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-tester-B-trace-V{N}.md
```

**Teammate 3 -- skeptic:**
```
Name: "skeptic"
Prompt: [full content of skeptic.md agent prompt]
  + BUG_CONTEXT_REPORT: [full content]
  + GRAFANA_REPORT: [full content]
  + PRODUCTION_REPORT: [full content]
  + CODEBASE_SEMANTICS_STEP4_REPORT: [full content]
  + SLACK_REPORT: [full content]
  + FINDINGS_SUMMARY: [full content of findings-summary.md]

  Wait for hypothesis-tester-A and hypothesis-tester-B to complete their tasks.
  Read BOTH their output files:
  - HYPOTHESIS_A_REPORT: {OUTPUT_DIR}/hypotheses/hypotheses-tester-A-output-V{N}.md
  - HYPOTHESIS_B_REPORT: {OUTPUT_DIR}/hypotheses/hypotheses-tester-B-output-V{N}.md

  Cross-examine both hypotheses. Apply the 5-point checklist.
  Produce a verdict: Confirmed or Declined with confidence 0-100%.
  If neither passes, explain exactly what evidence is missing.

  OUTPUT_FILE: {OUTPUT_DIR}/skeptic/skeptic-output-V{HYPOTHESIS_INDEX}.md
  TRACE_FILE: {OUTPUT_DIR}/skeptic/skeptic-trace-V{HYPOTHESIS_INDEX}.md
```

### 5A.3: Create Task List

```
Task 1: "Test hypothesis A: [Theory A title]" -- assigned to hypothesis-tester-A, no dependencies
Task 2: "Test hypothesis B: [Theory B title]" -- assigned to hypothesis-tester-B, no dependencies
Task 3: "Cross-examine and produce verdict" -- assigned to skeptic, blocked by Task 1 and Task 2
```

### 5A.4: Wait for Verdict

Wait for Task 3 (skeptic) to complete. Read the skeptic's output file. Proceed to Decision Point.

---

## STEP 5B: Sequential Subagent (Fallback -- when Agent Teams disabled)

Read the agent prompt from `agents/hypotheses.md`.

Increment `AGENT_COUNTERS[hypotheses]`. Launch **one** Task (model: sonnet):
```
Task: subagent_type="general-purpose", model="sonnet"
Prompt: [full content of hypotheses.md agent prompt]
  + BUG_CONTEXT_REPORT: [full content]
  + ENRICHED_CONTEXT: [full content -- domain objects from Fire Console]
  + CODEBASE_SEMANTICS_REPORT: [full content]
  + GRAFANA_REPORT: [full content]
  + PRODUCTION_REPORT: [full content]
  + CODEBASE_SEMANTICS_STEP4_REPORT: [full content]
  + SLACK_REPORT: [full content]
  + FINDINGS_SUMMARY: [full content of findings-summary.md]
  + RECOVERY_EVIDENCE: [full content from Step 4.5, or "No recovery window data -- resolution time unknown"]
  + FIRE_CONSOLE_SKILL_REFERENCE: [full content of FIRE_CONSOLE_SKILL]
  + [If iterating: ALL previous hypothesis files with their Verifier decisions]
  + OUTPUT_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-output-V{HYPOTHESIS_INDEX}.md
  + TRACE_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-trace-V{HYPOTHESIS_INDEX}.md

  This is hypothesis #{HYPOTHESIS_INDEX} of max 5.
  [If HYPOTHESIS_INDEX >= 3: "Warning: Iteration {HYPOTHESIS_INDEX}/5 -- focus on the strongest remaining theory. Address the specific gaps from previous declined hypotheses rather than exploring new directions."]
  [If HYPOTHESIS_INDEX >= 4: "Warning: Iteration {HYPOTHESIS_INDEX}/5 -- nearing limit. Prioritize the theory with the most supporting evidence. If no theory has strong evidence, clearly state what cannot be determined and why."]
  [If iterating: "Previous hypotheses were Declined. Read them all and do NOT repeat the same theory. The verifier identified these gaps: [list gaps from findings-summary]."]
  Form your hypothesis FROM the data in the reports. Proof = logs + code + timeline.
  You CAN query Fire Console (invoke_rpc) on-demand to inspect domain objects that support your theory.
  MANDATORY: Include "Why Did It Start Working Again?" and "Concurrent Events" sections.
```

**Quality gate:** Verify hypothesis has:
- `status: Unknown` at top
- All required sections present
- Evidence cites specific data (timestamps, file:line, PR numbers)
- "Actual Proof vs Correlation" section distinguishes proven vs assumed

### STEP 5B.2: Verifier (Sequential only)

Read the agent prompt from `agents/verifier.md`. Launch **one** Task (model: sonnet):
```
Task: subagent_type="general-purpose", model="sonnet"
Prompt: [full content of verifier.md agent prompt]
  + BUG_CONTEXT_REPORT: [full content]
  + ENRICHED_CONTEXT: [full content -- domain objects from Fire Console]
  + CURRENT_HYPOTHESIS_FILE: {OUTPUT_DIR}/hypotheses/hypotheses-output-V{HYPOTHESIS_INDEX}.md
  + CURRENT_HYPOTHESIS_REPORT: [full content]
  + GRAFANA_REPORT: [full content]
  + PRODUCTION_REPORT: [full content]
  + CODEBASE_SEMANTICS_STEP4_REPORT: [full content]
  + SLACK_REPORT: [full content]
  + FIRE_CONSOLE_SKILL_REFERENCE: [full content of FIRE_CONSOLE_SKILL]
  + OUTPUT_FILE: {OUTPUT_DIR}/verifier/verifier-output-V{HYPOTHESIS_INDEX}.md
  + TRACE_FILE: {OUTPUT_DIR}/verifier/verifier-trace-V{HYPOTHESIS_INDEX}.md

  Evaluate the hypothesis against ALL 5 checklist items.
  ALL 5 must Pass for Confirmed. Any Fail = Declined.
  You CAN query Fire Console (invoke_rpc) to verify domain-specific claims in the hypothesis.
  You MUST update the hypothesis file: change status and add Verifier Decision section.
```

Proceed to Decision Point.

---

## STEP 6: Decision Point (shared by 5A and 5B)

Read the verdict (from skeptic in 5A, or verifier in 5B).

### If CONFIRMED:

1. Verify the orchestrator override conditions:
   - Are all 5 checklist items clearly Pass?
   - Is there no "we do not know WHY" for intermediate causes?
   - Is the causal chain fully proven (no assumed links)?
   - If ANY override triggers: treat as DECLINED and continue below.
2. If truly Confirmed: proceed to Phase 7 (Fix List).

### If DECLINED:

1. **Update findings-summary.md** with:
   - Current state: `DECLINED_ITERATION_{HYPOTHESIS_INDEX}`
   - Current checklist status (Pass/Fail per item)
   - What's proven, what's missing
   - Next tasks from verdict's evidence gaps
   - Updated agent invocation log

2. **Check iteration limit:** If `HYPOTHESIS_INDEX >= 5`:
   - Present all findings to user
   - Show what's proven vs unknown
   - Ask: continue investigating or document with best hypothesis?

3. **Check for confidence floor:** If confidence >= 70% but not all 5 pass:
   - Note this in findings-summary as "High confidence, incomplete proof"
   - If this is the 3rd+ iteration with similar confidence, consider presenting to user

4. **Parse specific evidence gaps and TARGETED queries:**
   - Read the verdict's evidence gaps section for EXACT SQL queries
   - If exact SQL queries provided: **run them directly via `query_app_logs`** (no need to re-launch the full Grafana agent). Store results as `TARGETED_GRAFANA_RESULTS`.
   - For each evidence gap:
     - "no MSID link" -> search by booking ID, order ID, time correlation using the SQL
     - "no stack trace" -> query with error_class filter using the SQL
     - "no timeline" -> run hourly aggregation query using the SQL
     - "no recovery explanation" -> search all levels around recovery time using the SQL
   - **Update findings-summary.md with targeted results BEFORE next iteration**

5. **Execute remaining evidence-gathering tasks:**
   - If verdict requested agent re-runs (codebase, Slack, production):
     - Run agents with their TAILORED TASK from the verdict
     - Pass findings-summary.md AND relevant skill files to each agent
     - Independent agents can run in parallel (multiple Task calls in same message, model: sonnet)
   - If no specific next tasks:
     - Re-run Step 4 (all three agents in parallel) with the verdict's guidance

6. **Increment HYPOTHESIS_INDEX.** Go to STEP 5 (new hypothesis round) with TARGETED_GRAFANA_RESULTS as additional input.

7. **MANDATORY: Do NOT stop.** Continue the loop until Confirmed or iteration limit.

---

## Regather Logic

When a hypothesis is DECLINED, the orchestrator performs targeted data collection before the next iteration:

1. **Inline Grafana queries** -- If the verifier/skeptic provided exact SQL queries, run them directly (no agent launch overhead).
2. **Targeted agent re-runs** -- If the verdict requests specific agent tasks, run them with tailored prompts that focus on the evidence gaps.
3. **Parallel re-runs** -- Independent agents can be re-launched in parallel in a single message.
4. **Findings-summary update** -- Always update findings-summary.md with new data BEFORE generating the next hypothesis.

The goal is to provide the next hypothesis iteration with strictly MORE data than the previous one, addressing the specific gaps identified by the verifier/skeptic.

---

## Iteration Pressure

As iterations increase, the hypothesis agent receives escalating warnings:

| Iteration | Pressure Level |
|-----------|---------------|
| 1-2 | Normal -- explore freely |
| 3 | "Focus on the strongest remaining theory. Address specific gaps rather than exploring new directions." |
| 4 | "Nearing limit. Prioritize the theory with the most supporting evidence." |
| 5 | Iteration limit. Present to user with what's proven vs unknown. |

If the same gap persists across 3+ iterations (same checklist item keeps failing), flag this to the user as a potential data limitation.
