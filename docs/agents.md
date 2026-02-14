# Agents

Production Master uses 12 specialized agents, each with a single focused role. Agents are launched as subagents via the `Task` tool with `model: "sonnet"`.

---

## bug-context

**Role:** Parses Jira tickets into structured investigation briefs.

**Inputs:** Raw Jira JSON, user's original message.

**Outputs:** Structured brief with:
- Services involved (names + artifact IDs)
- Time window (when the issue started/ended)
- Key identifiers (MSID, booking IDs, request IDs, etc.)
- Symptoms and user-reported behavior
- Artifact validation table

**Quality gate:** Must contain services, time window, and identifiers. If missing critical data, the orchestrator asks the user before proceeding.

---

## artifact-resolver

**Role:** Validates service names against Grafana to find correct artifact IDs.

**Inputs:** Bug context report, service names to validate.

**Skills:** `grafana-datasource`

**Outputs:** Validated artifact ID table with:
- Exact match status (confirmed/not found)
- Log count in the time window
- LIKE search suggestions for unresolved names

**When launched:** Only when Step 1.5 inline validation finds ambiguous artifacts. For simple cases, the orchestrator validates inline.

---

## grafana-analyzer

**Role:** Queries production logs and reports raw findings.

**Inputs:** Bug context, enriched context (from Fire Console), skill reference.

**Skills:** `grafana-datasource`

**Outputs:**
- Error overview (grouped by message, error_class)
- Error timeline (hourly aggregation)
- Sample error logs with stack traces
- Request IDs for cross-service tracing
- AppAnalytics URLs for every queried service

**Quality gate:** At least one query executed. AppAnalytics URLs present. Request IDs captured if errors found.

---

## codebase-semantics

**Role:** Maps code flows, error propagation paths, and service boundaries.

**Inputs:** Bug context, Grafana report, local repo path (if available), skill reference.

**Skills:** `octocode`

**Outputs (Report Type A — Error propagation):**
- Error propagation table: for each Grafana error → file:line, condition, affected services
- Code flow maps with entry/exit points
- Service boundary analysis

**Outputs (Report Type B — PR analysis):**
- Recent PRs with change analysis
- "Why started / why ended" section linking code changes to incident timing

**Quality gate:** Error propagation table with file:line references (not vague descriptions). Services list with artifact_ids.

---

## production-analyzer

**Role:** Finds PRs, commits, and feature toggle changes around the incident time.

**Inputs:** Bug context, codebase semantics report, Grafana report (for error context only), skill references.

**Skills:** `github`, `ft-release`

**Outputs:**
- PR table with merge times, authors, files changed
- Commit timeline
- Feature toggle changes (status, strategy, rollout percentage)
- Deployment timeline (if detectable)

**Quality gate:** Has PR table, has timeline, has toggle check.

**Isolation:** Does NOT see Slack or other data agents' outputs.

---

## slack-analyzer

**Role:** Searches Slack for discussions related to the incident.

**Inputs:** Bug context, codebase semantics report (for service names and keywords), skill reference.

**Skills:** `slack`

**Outputs:**
- Search results with channel, author, timestamp
- Full thread context (all replies fetched)
- Verbatim message quotes

**Quality gate:** Search results present. All threads have replies fetched.

**Isolation:** Does NOT see Grafana, Production, or other data agents' outputs.

---

## hypotheses

**Role:** Generates testable root cause theories from all collected data.

**Inputs:** All data reports (bug context, enriched context, Grafana, codebase, production, Slack, findings summary, recovery evidence), Fire Console skill reference.

**Skills:** `fire-console` (on-demand domain queries to gather additional evidence)

**Outputs:**
- Root cause hypothesis with evidence chain
- "Why Did It Start Working Again?" analysis
- "Concurrent Events" section
- "Actual Proof vs Correlation" distinguishing proven vs assumed facts
- Status: `Unknown` (set by verifier/skeptic later)

**Modes:**
- **Mode 1 (Sequential):** Single hypothesis agent, followed by verifier
- **Mode 2 (Agent Team):** Two competing hypothesis testers (A and B), followed by skeptic cross-examination

**Quality gate:** Status line at top. All required sections present. Evidence cites specific data (timestamps, file:line, PR numbers).

---

## verifier

**Role:** Quality gate that evaluates whether a hypothesis is proven with airtight evidence.

**Inputs:** Current hypothesis, all data reports, Fire Console skill reference.

**Skills:** `fire-console` (on-demand verification of domain-specific claims)

**Outputs:**
- 5-point checklist evaluation (all must Pass for Confirmed):
  1. Pinpoint explanation of what failed
  2. Why the issue started
  3. Whether the fix is still in the code
  4. Why the issue stopped
  5. Evidence chain completeness
- Verdict: Confirmed or Declined
- Confidence score (0-100%)
- Evidence gaps (specific queries to fill gaps)
- Next tasks for re-investigation (if Declined)

**Decision:** Updates the hypothesis file with status and decision section.

---

## skeptic

**Role:** Cross-examines competing hypotheses when agent teams are enabled.

**Inputs:** Two hypothesis reports (Tester A and Tester B), bug context, Grafana report, production report, Slack report, findings summary.

**Outputs:**
- Side-by-side comparison of both theories
- 5-point checklist applied to each
- Verdict: which theory (if any) passes
- Confidence score
- Evidence gaps for both theories

**When used:** Only in Agent Team mode (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1).

---

## fix-list

**Role:** Creates actionable fix plans from confirmed hypotheses.

**Inputs:** Confirmed hypothesis, verifier report, codebase semantics report, enriched context, FT-release skill reference.

**Skills:** `ft-release`

**Outputs:**
- Ordered fix plan with:
  - Immediate actions (toggle rollback, config change)
  - Code fixes (file:line, what to change)
  - Monitoring additions
- Rollback options (feature toggles that can be reverted)
- Risk assessment for each fix

---

## documenter

**Role:** Compiles all pipeline output into a professional investigation report.

**Inputs:** All data reports, all hypothesis iterations, verifier report, fix plan, user input.

**Outputs:**
- `report.md` — Final investigation report (Markdown only, no HTML)
- All links embedded inline
- All hypothesis iterations documented
- TL;DR summary at the top

**Post-processing:** The `validate-report-links` hook runs automatically and flags broken/placeholder URLs.

---

## publisher

**Role:** Publishes investigation findings to Jira and/or Slack.

**Inputs:** Report content, bug context, verifier report, publish destination.

**Skills:** `jira`, `slack`

**Outputs:**
- Jira comment on the ticket (formatted summary)
- Slack thread in specified channel (formatted summary)
- Verification that all links in the published content are valid

**Rules:**
- Never include Slack channel links without verifying the channel exists
- Never fabricate channel names
- Verify ALL hyperlinks before posting
