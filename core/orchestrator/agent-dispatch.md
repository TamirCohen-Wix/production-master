# Agent Dispatch

Extracted from `commands/production-master.md` orchestration rules and agent launch patterns. This module defines agent execution rules, model tiering, data isolation, skill injection, and core design principles.

> Cross-references: Phase sequencing in [state-machine.md](state-machine.md). Hypothesis agent details in [hypothesis-loop.md](hypothesis-loop.md). Findings-summary format in [findings-summary-schema.md](findings-summary-schema.md). MCP failure handling in [recovery-protocol.md](recovery-protocol.md).

---

## Core Design Principles

1. **Skill-aware agents** -- Every agent that uses MCP tools receives the relevant skill file content in its prompt. This is how they know exact parameter names and formats.
2. **Data isolation** -- Data agents never see each other's outputs. Only Hypothesis and Verifier synthesize across sources.
3. **Raw data -> analysis** -- Data agents report raw findings ONLY. Analysis happens in Hypothesis/Verifier.
4. **Self-validation** -- Every agent validates its output against a checklist before writing.
5. **Autonomous decisions** -- The orchestrator decides what to investigate next. Do not ask the user mid-investigation.
6. **Fresh start** -- Never read from previous `debug-*` directories. Each run creates a new directory under `.claude/debug/` (or `./debug/` outside a repo).
7. **True parallelism** -- Launch independent agents in the SAME message using multiple Task calls.
8. **Model tiering** -- Use `model: "haiku"` for simple agents (bug-context, service-resolver, documenter, publisher). Use `model: "sonnet"` for reasoning agents (all others). Never use Opus for subagents.
9. **Fast-fail** -- If an MCP tool or agent fails, report it immediately. Do not retry silently or fabricate data.
10. **Explicit state** -- `findings-summary.md` is the persistent state file. Update it after every step with what's proven, what's missing, and what to do next.
11. **Citation required** -- Every factual claim must cite its source. A "proof" is a verifiable reference: a file path with line number, a Grafana query result, a PR link, a Jira comment, a Slack message URL, or an MCP tool response. A "citation" is the inline reference to that proof. Rules:
    - NEVER state "X calls Y" without a file:line or GitHub link
    - NEVER state traffic numbers without a Grafana query reference
    - NEVER reference a frontend repo or widget without verifying it exists (use Octocode or GitHub search)
    - NEVER reference code in `statics/viewer/angular/` in the scheduler repo -- it is dead code
    - When unsure, say "unverified" and flag it for the user

---

## Architecture

The orchestrator launches subagents via the `Task` tool with `subagent_type: "general-purpose"`. Each agent's prompt is in the `agents/` directory (resolved by Claude Code from plugin or `~/.claude/agents/`). MCP tool documentation is in `skills/<server>/SKILL.md` -- pass relevant skill file content to agents that use those tools.

---

## Model Tiering

| Tier | Model | Agents |
|------|-------|--------|
| **Haiku** (simple tasks) | `model: "haiku"` | bug-context, service-resolver, documenter, publisher |
| **Sonnet** (reasoning tasks) | `model: "sonnet"` | log-analyzer, codebase-semantics, change-analyzer, comms-analyzer, hypotheses, verifier, skeptic, fix-list |
| **Opus** | Never used for subagents | The orchestrator itself runs on whatever model the user's session uses |

---

## Capability Resolution

Before loading skill files, the orchestrator resolves abstract capability names to concrete provider skill files. See `core/capabilities/router.md` for the full resolution flow.

| Capability | Abstract Skill | Vendor Skill (default) |
|------------|---------------|----------------------|
| log-system | `skills/log-system/SKILL.md` | `skills/grafana-datasource/SKILL.md` |
| ticket-system | `skills/ticket-system/SKILL.md` | `skills/jira/SKILL.md` |
| code-search | `skills/code-search/SKILL.md` | `skills/octocode/SKILL.md` |
| team-communications | `skills/team-comms/SKILL.md` | `skills/slack/SKILL.md` |
| version-control | `skills/version-control/SKILL.md` | `skills/github/SKILL.md` |
| feature-flags | `skills/feature-flags/SKILL.md` | `skills/ft-release/SKILL.md` |
| knowledge-base | n/a (vendor-first) | `skills/kb-retrieval/SKILL.md` |
| internal-docs-schema | n/a (vendor-first) | `skills/docs-schema/SKILL.md` |
| devex-intelligence | n/a (vendor-first) | `skills/devex/SKILL.md` |
| db-ops | n/a (vendor-first) | `skills/db-core/SKILL.md` |
| data-warehouse | n/a (vendor-first) | `skills/trino/SKILL.md` |
| root-cause-orchestration | n/a (vendor-first) | `skills/root-cause/SKILL.md` |

By default, vendor skill files are loaded (current behavior). When capability routing is active (future), abstract skill files are loaded instead. The variable names remain the same either way.

---

## Skill File Distribution

Every agent that uses MCP tools MUST receive the corresponding skill file in its prompt as `<SERVER>_SKILL_REFERENCE`.

| Agent | Capability | Skill File(s) |
|-------|-----------|---------------|
| log-analyzer | log-system | `skills/grafana-datasource/SKILL.md` |
| codebase-semantics | code-search, internal-docs-schema | `skills/octocode/SKILL.md` + `skills/docs-schema/SKILL.md` |
| comms-analyzer | team-communications | `skills/slack/SKILL.md` |
| change-analyzer | version-control, feature-flags, devex-intelligence | `skills/github/SKILL.md` + `skills/ft-release/SKILL.md` + `skills/devex/SKILL.md` |
| fix-list | feature-flags | `skills/ft-release/SKILL.md` |
| publisher | ticket-system, team-communications | `skills/jira/SKILL.md` + `skills/slack/SKILL.md` |
| hypotheses / verifier | domain-objects, knowledge-base, db-ops, data-warehouse, root-cause-orchestration | `skills/fire-console/SKILL.md` + `skills/kb-retrieval/SKILL.md` + `skills/db-core/SKILL.md` + `skills/trino/SKILL.md` + `skills/root-cause/SKILL.md` |
| fire-console enrichment | domain-objects | `skills/fire-console/SKILL.md` |

**Load ALL skill files once at Step 0.5** -- don't re-read them for every agent launch:
```
GRAFANA_SKILL      = read("skills/grafana-datasource/SKILL.md")
OCTOCODE_SKILL     = read("skills/octocode/SKILL.md")
SLACK_SKILL        = read("skills/slack/SKILL.md")
GITHUB_SKILL       = read("skills/github/SKILL.md")
FT_RELEASE_SKILL   = read("skills/ft-release/SKILL.md")
FIRE_CONSOLE_SKILL = read("skills/fire-console/SKILL.md")
KB_RETRIEVAL_SKILL = read("skills/kb-retrieval/SKILL.md")
DOCS_SCHEMA_SKILL  = read("skills/docs-schema/SKILL.md")
DEVEX_SKILL        = read("skills/devex/SKILL.md")
DB_CORE_SKILL      = read("skills/db-core/SKILL.md")
TRINO_SKILL        = read("skills/trino/SKILL.md")
ROOT_CAUSE_SKILL   = read("skills/root-cause/SKILL.md")
```

---

## Data Flow Control

1. **ALWAYS pass FULL reports** between agents -- never summarize or truncate.
2. **Request IDs are critical data.** When Grafana or any agent discovers request_ids, propagate them to ALL downstream agents (hypothesis, verifier, documenter, publisher). Request IDs enable cross-service correlation and are essential for follow-up investigation. The final report MUST list all discovered request_ids as clickable Grafana trace links.
3. **Data agents (Grafana, Slack, Production, Codebase) NEVER see each other's outputs.** They receive only: BUG_CONTEXT, CODEBASE_SEMANTICS (for services/time frame), and their TASK (if re-invoked).
4. **Only Hypothesis and Verifier receive all reports.** They are the only agents that synthesize across data sources.
5. **Findings-summary.md is the state file.** Update it after every step. Include the agent invocation log.

### Data Isolation Matrix

| Agent | Receives | Does NOT receive |
|-------|----------|-----------------|
| bug-context | JIRA_DATA, USER_INPUT | (nothing else) |
| log-analyzer | BUG_CONTEXT, ENRICHED_CONTEXT, GRAFANA_SKILL | Other agent reports |
| codebase-semantics | BUG_CONTEXT, ENRICHED_CONTEXT, GRAFANA_REPORT, OCTOCODE_SKILL, DOCS_SCHEMA_SKILL | Slack, Production reports |
| change-analyzer | BUG_CONTEXT, ENRICHED_CONTEXT, CODEBASE_SEMANTICS, GRAFANA_REPORT, GITHUB_SKILL, FT_RELEASE_SKILL, DEVEX_SKILL | Slack report |
| comms-analyzer | BUG_CONTEXT, ENRICHED_CONTEXT, CODEBASE_SEMANTICS, SLACK_SKILL | Production, Grafana reports |
| hypotheses | ALL reports, FINDINGS_SUMMARY, FIRE_CONSOLE_SKILL, KB_RETRIEVAL_SKILL, DB_CORE_SKILL, TRINO_SKILL, ROOT_CAUSE_SKILL | (receives everything) |
| verifier / skeptic | ALL reports, FINDINGS_SUMMARY, FIRE_CONSOLE_SKILL, KB_RETRIEVAL_SKILL, DB_CORE_SKILL, TRINO_SKILL, ROOT_CAUSE_SKILL | (receives everything) |
| fix-list | BUG_CONTEXT, ENRICHED_CONTEXT, VERIFIER_REPORT, HYPOTHESIS, CODEBASE_SEMANTICS, ACCESS_LOG_REPORT, FT_RELEASE_SKILL | Raw Grafana/Slack data |
| documenter | ALL reports, FIX_PLAN | (receives everything) |
| publisher | REPORT, BUG_CONTEXT, VERIFIER_REPORT | Raw agent outputs |

---

## Parallelism Rules

1. **Step 4 agents MUST run in parallel** -- launch ALL Task calls in a SINGLE message (not sequential messages). This is the #1 performance bottleneck. If you launch them one-by-one, the investigation takes 4x longer.
2. **Re-invoked agents after Declined:** Run independent ones in parallel, dependent ones sequentially.
3. **Never wait for an agent that isn't needed** for the next step.
4. **Minimize sequential bottlenecks.** Steps 1->1.3->1.5->2->2.5->3 are sequential because each depends on the previous. But Step 4's agents are ALL independent -- they MUST be parallel. Step 5's hypothesis testers (in team mode) are also independent and parallel.
5. **Use `run_in_background: true`** for agents that can run concurrently with the orchestrator's inline work.

---

## Agent Isolation Rules

1. **Each agent's prompt includes ONLY its designated inputs.** Do not leak other agents' findings into data-collection agents.
2. **The orchestrator is the ONLY entity that reads all reports.** Agents never read each other's files.
3. **Every run starts fresh.** Never read from previous `debug-*` directories. Never reference findings, hypotheses, or conclusions from previous investigation sessions.
4. **Trace files are NEVER shared.** Never pass `-trace-V*.md` file content to any agent. Trace files are for human debugging only.

---

## Self-Validation & Quality Gates

1. **Every agent has a self-validation checklist** in its prompt. If an agent's output is missing required sections, re-launch with specific correction instructions.
2. **Grafana must produce at least one query result** (even if "no errors found") before proceeding.
3. **Codebase-semantics must produce error propagation** before Step 4 runs.
4. **All hypothesis files must have `status:` line at the top.**
5. **Verifier MUST update the hypothesis file** (status + decision section).
6. **Re-launch threshold:** Re-launch an agent at most ONCE for quality gate failures. If it fails again, note the gap and proceed.

---

## Diagnostic Checklist (when an agent underperforms)

If an agent returns incomplete output, ask these diagnostic questions before re-launching:
- Does it misunderstand the task? -> Restructure the prompt.
- Does it fail on the same MCP call? -> Check skill reference parameters.
- Does it include forbidden content (conclusions, analysis)? -> Re-emphasize "RAW DATA ONLY" rule.
- Did it run out of context? -> Reduce input size by summarizing non-critical reports.

---

## Performance Optimization

1. **Minimize agent launches.** Simple tasks (bug-context parsing, artifact validation, targeted Grafana queries) should be done INLINE by the orchestrator, not via separate agents. Agent launches have ~30-60s overhead.
2. **MCP call batching.** MCP calls can take 30-60s each. Minimize sequential MCP calls:
   - Batch independent queries in parallel tool calls
   - Use `ToolSearch` once per server, not once per tool
   - Prefer broader queries over many narrow ones
3. **Prompt size matters.** Large prompts slow down agent startup. For re-invoked agents, pass only the NEW data they need + a summary of what's already proven.
4. **Step 0.3 MCP check optimization.** Run ALL 7 ToolSearch calls in a single message, then ALL 7 health checks in the next message.
5. **Avoid unnecessary agent re-launches.** If the verifier's "Next Tasks" only requires a single Grafana query, run it inline.

---

## User Claim Verification

When the user states something about a service role (e.g., "loyalty-notifier is the TimeCapsule server"):
- Do NOT take it at face value
- Run a quick verification: query Grafana for the claimed artifact with relevant keywords, or check the service's code/config
- If the claim doesn't match the data, note the discrepancy and proceed with verified information

---

## Feature Toggle (FT) Release Lifecycle

Agents must understand the Wix FT release lifecycle to reason about FT-related changes:

1. Developer creates a feature toggle (FT) in code and on Wix Dev Portal
2. FT is gradually rolled out (0% -> 25% -> 50% -> 100%) over weeks/months
3. FT stays at 100% for ALL users for a long time (weeks to months)
4. Only then does a developer create a "merge FT" PR that removes the toggle from code
5. The merge PR deletes dead code -- the toggle was already at 100% so behavior doesn't change

**Key distinction for investigations:**
- The **FT rollout date** is when behavior actually changed for users -- this CAN be a root cause
- The **FT merge PR date** is when code was cleaned up -- this typically does NOT change behavior
- Use `list-releases(featureToggleId)` to find when the FT was actually rolled out to users
- In rare cases, the merge PR itself could introduce a bug during code cleanup

---

## Configuration and Settings Investigation (MANDATORY)

Always investigate configuration/settings changes alongside code changes. Production bugs are often caused by:
- Site-level settings changes (e.g., TimeSlotsConfiguration, staff selection strategy)
- User/admin configuration updates (pricing plans, service definitions, resource settings)
- Feature toggle rollouts reaching specific sites
- Backend configuration changes (rate limits, policies, quotas)

The Grafana analyzer and hypothesis agents MUST check for settings-related causes, not just code PRs. Use Fire Console to inspect current site/service configuration.
