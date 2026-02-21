# Production Master: PR Plan

> **Document Type:** Implementation Execution Plan — PR Breakdown
> **Version:** 1.0
> **Date:** 2026-02-21
> **Author:** Tamir Cohen
> **Status:** Draft
> **References:** [04-implementation-plan.md](./04-implementation-plan.md), [05-capability-abstraction-layer.md](./05-capability-abstraction-layer.md), [07-gaps-and-enhancements.md](./07-gaps-and-enhancements.md)

---

> This document breaks the implementation plan into concrete, reviewable pull requests. Each PR has a checklist of deliverables, clear dependencies, and parallelism annotations. PRs are grouped by phase and ordered by dependency — not by calendar date.
>
> **Status note (2026-02-21):** Several early-phase items are already implemented in-repo even where checkboxes below are still unchecked. Validate status against current filesystem/CI state before opening follow-up PRs.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `-->` | Must be merged before the next PR can start |
| `\|\|` | Can run in parallel with sibling PRs in the same group |
| `[GATE]` | Milestone — all PRs above must be merged before proceeding |

---

## Phase 0: Design & Review

> No code PRs. Design docs are already in the repo.

- [x] Design docs 00-05 written and committed
- [ ] Team review and sign-off on architecture

`[GATE] Phase 0 complete — design approved`

---

## Phase 1: Core Extraction

All Phase 1 PRs are sequential except where marked parallel.

### PR 1.1 — Scaffold `core/` directory structure

```
Branch: feat/core-scaffold
```

- [ ] Create `core/` top-level directory
- [ ] Create empty subdirectories: `agents/`, `skills/`, `orchestrator/`, `output-styles/`, `domain/`, `tests/`
- [ ] Add `core/VERSION` file with `2.0.0-alpha.1`
- [ ] Add `core/mcp-servers.json` (copy from current root)
- [ ] Update `.gitignore` if needed

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.1 for the production-master monorepo migration. Your task is to scaffold the core/ directory structure.

CONTEXT:
- Repository: /Users/tamirc/Projects/production-master (git repo, branch: main)
- This is a Claude Code plugin with 12 agents, 9 skills, 9 commands, and 9 MCP integrations
- We are restructuring into a monorepo: core/ (shared engine), adapter-claude/, adapter-cursor/, adapter-cloud/
- This PR only creates the empty directory structure and copies one file

TASKS:
1. Create the directory: core/
2. Create these empty subdirectories inside core/:
   - agents/
   - skills/
   - orchestrator/
   - output-styles/
   - domain/
   - tests/
3. Create core/VERSION with content: 2.0.0-alpha.1
4. Copy mcp-servers.json from the repo root into core/mcp-servers.json (keep the original)
5. Verify .gitignore does not need updates (git tracks directories via files, so add a .gitkeep in each empty dir)

IMPORTANT:
- Do NOT move or modify any existing files
- Do NOT delete anything
- Add .gitkeep files in empty directories so git tracks them
- The mcp-servers.json at the root contains 9 MCP server configs with placeholder keys (<YOUR_ACCESS_KEY>) — copy it as-is
- Create a branch: feat/core-scaffold
- Commit with message: "feat: scaffold core/ directory structure"
```

</details>

`--> PR 1.2, PR 1.3, PR 1.4 (all unblocked after this)`

---

### PR 1.2 — Move agents to `core/agents/` `||`

```
Branch: feat/core-agents
```

- [ ] Copy all 12 agent `.md` files from `agents/` to `core/agents/`
- [ ] Verify each file has required frontmatter (name, description, model)
- [ ] Keep original `agents/` directory intact for now (backward compat)
- [ ] Add `core/tests/validate-agents.sh` — checks all 12 agents exist with required fields

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.2 for the production-master monorepo migration. Your task is to copy all agents into core/agents/ and create a validation script.

CONTEXT:
- The core/ directory already exists (PR 1.1 merged)
- There are exactly 12 agent files in agents/ at the repo root

THE 12 AGENTS (all .md files in agents/):
  artifact-resolver.md, bug-context.md, codebase-semantics.md, documenter.md,
  fix-list.md, grafana-analyzer.md, hypotheses.md, production-analyzer.md,
  publisher.md, skeptic.md, slack-analyzer.md, verifier.md

TASKS:
1. Copy all 12 .md files from agents/ to core/agents/ (preserve content exactly)
2. Remove core/agents/.gitkeep if it exists
3. Verify each file's YAML frontmatter contains these required fields:
   - name (string)
   - description (string)
   - model (one of: haiku, sonnet)
   Note: Frontmatter may use Claude Code agent format — look for lines like:
   "name: <value>" near the top, or a YAML block between --- markers
4. Create core/tests/validate-agents.sh with these checks:
   - Verify exactly 12 .md files exist in core/agents/
   - Verify each of the 12 expected filenames is present
   - Verify each file is non-empty
   - Exit 0 on success, exit 1 with details on failure
   - Make it executable (chmod +x)
5. Do NOT delete or modify the original agents/ directory

VALIDATION SCRIPT TEMPLATE:
#!/usr/bin/env bash
set -euo pipefail
AGENTS_DIR="$(dirname "$0")/../agents"
EXPECTED="artifact-resolver bug-context codebase-semantics documenter fix-list grafana-analyzer hypotheses production-analyzer publisher skeptic slack-analyzer verifier"
# ... check each exists and is non-empty

Branch: feat/core-agents
Commit: "feat: copy agents to core/agents/ with validation script"
```

</details>

### PR 1.3 — Move skills to `core/skills/` `||`

```
Branch: feat/core-skills
```

- [ ] Copy all 9 skill directories from `skills/` to `core/skills/`
- [ ] Verify each directory contains `SKILL.md`
- [ ] Keep original `skills/` directory intact for now
- [ ] Add `core/tests/validate-skills.sh` — checks all 9 skills present

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.3 for the production-master monorepo migration. Your task is to copy all skill directories into core/skills/ and create a validation script.

CONTEXT:
- The core/ directory already exists (PR 1.1 merged)
- There are exactly 9 skill directories in skills/ at the repo root
- Each skill directory contains a SKILL.md file with MCP tool documentation

THE 9 SKILLS (directories in skills/):
  context7, fire-console, ft-release, github, grafana-datasource,
  grafana-mcp, jira, octocode, slack

TASKS:
1. Copy all 9 directories from skills/ to core/skills/ (preserve all contents exactly)
2. Remove core/skills/.gitkeep if it exists
3. Verify each directory contains a SKILL.md file
4. Create core/tests/validate-skills.sh with these checks:
   - Verify exactly 9 directories exist in core/skills/
   - Verify each of the 9 expected directory names is present
   - Verify each directory contains a non-empty SKILL.md
   - Exit 0 on success, exit 1 with details on failure
   - Make it executable (chmod +x)
5. Do NOT delete or modify the original skills/ directory

Branch: feat/core-skills
Commit: "feat: copy skills to core/skills/ with validation script"
```

</details>

### PR 1.4 — Move output styles and domain schema to `core/` `||`

```
Branch: feat/core-output-domain
```

- [ ] Copy `output-styles/` to `core/output-styles/`
- [ ] Create `core/domain/schema.json` — JSON Schema for `domain.json`
- [ ] Create `core/domain/loader.md` — loading priority documentation
- [ ] Create `core/domain/defaults.json` — default values for optional fields
- [ ] Validate existing `Domain/Bookings/Server/scheduler/domain.json` against schema

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.4 for the production-master monorepo migration. Your task is to copy output styles and create the domain configuration schema system.

CONTEXT:
- The core/ directory already exists (PR 1.1 merged)
- output-styles/ at root contains 2 files: investigation-report.md, publisher-format.md
- Domain/Bookings/Server/scheduler/domain.json is the only existing domain config — use it as the reference for the schema

TASKS:

1. Copy output-styles/ to core/output-styles/ (preserve content exactly, remove .gitkeep if present)

2. Create core/domain/schema.json — a JSON Schema (draft-07) that validates domain.json files.
   Required fields: company, division, side, repo, github_org, github_repo, jira_project, artifact_prefix, primary_services
   Optional fields: jira_url, slack_channels (object with alerts/dev/incidents), toggle_prefix, grafana_url,
     grafana_app_analytics_dashboard, request_id_format, language, build_system, monorepo
   primary_services is an array of objects with {name: string, artifact_id: string}
   slack_channels is an object with optional keys: alerts, dev, incidents (all strings)

   Reference the existing domain.json for field types:
   {
     "company": "Wix", "division": "Bookings", "side": "Server", "repo": "scheduler",
     "github_org": "wix-private", "github_repo": "wix-private/scheduler",
     "jira_project": "SCHED", "jira_url": "https://wix.atlassian.net",
     "artifact_prefix": "com.wixpress.bookings",
     "primary_services": [{"name": "bookings-service", "artifact_id": "com.wixpress.bookings.bookings-service"}, ...],
     "slack_channels": {"alerts": "#bookings-alerts", "dev": "#bookings-dev", "incidents": "#bookings-incidents"},
     "request_id_format": "<unix_timestamp>.<random>", "toggle_prefix": "specs.bookings",
     "language": "scala", "build_system": "bazel", "monorepo": true,
     "grafana_url": "https://grafana.wixpress.com", "grafana_app_analytics_dashboard": "olcdJbinz"
   }

3. Create core/domain/loader.md documenting loading priority:
   1. ~/.claude/production-master/domains/<repo>/domain.json (Claude Code user)
   2. ~/.cursor/production-master/domains/<repo>/domain.json (Cursor user)
   3. .claude/domain.json (project-level, Claude Code)
   4. .cursor/domain.json (project-level, Cursor)
   5. Database domain_configs table (Cloud)
   6. Domain/<Division>/<Side>/<repo>/domain.json (repo fallback)

4. Create core/domain/defaults.json with sensible defaults for optional fields:
   { "language": "unknown", "build_system": "unknown", "monorepo": false }

5. Validate: run `npx ajv-cli validate -s core/domain/schema.json -d Domain/Bookings/Server/scheduler/domain.json`
   or write a small validation script. The existing domain.json MUST pass.

6. Do NOT delete original output-styles/ directory

Branch: feat/core-output-domain
Commit: "feat: add output styles and domain schema to core/"
```

</details>

`--> PR 1.5 (needs agents and skills in core/)`

---

### PR 1.5 — Extract orchestrator modules from monolith command

```
Branch: feat/core-orchestrator
```

- [ ] Extract `core/orchestrator/intent-classifier.md` — 7 intent modes
- [ ] Extract `core/orchestrator/state-machine.md` — 9-phase pipeline definition
- [ ] Extract `core/orchestrator/hypothesis-loop.md` — generate/verify/decide/regather cycle
- [ ] Extract `core/orchestrator/agent-dispatch.md` — agent sequencing, parallelism, data flow
- [ ] Extract `core/orchestrator/findings-summary-schema.md` — persistent state file format
- [ ] Extract `core/orchestrator/recovery-protocol.md` — mid-investigation recovery rules
- [ ] Add `core/tests/validate-orchestrator.sh` — all 6 modules exist and are non-empty

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.5 for the production-master monorepo migration. This is the most critical PR — you must decompose the monolithic orchestrator command into modular core documents.

CONTEXT:
- The source file is commands/production-master.md (~71KB, ~1500 lines)
- It contains ALL orchestrator logic: intent classification, state machine, hypothesis loop, agent dispatch, recovery
- You must extract sections into 6 separate core/orchestrator/ modules
- The original commands/production-master.md stays UNTOUCHED — we extract copies
- Read design-docs/04-implementation-plan.md Section 6 "Core Engine Specification" for the target structure

SOURCE FILE TO READ FIRST:
  commands/production-master.md — read the ENTIRE file before starting

TARGET FILES AND WHAT TO EXTRACT:

1. core/orchestrator/intent-classifier.md
   Extract from "STEP 0: Intent Classification" section:
   - The 7 intent modes: FULL_INVESTIGATION, QUERY_LOGS, TRACE_REQUEST, QUERY_METRICS, SEARCH_SLACK, SEARCH_CODE, TOGGLE_CHECK
   - Argument parsing logic (flags: --skip-slack, --skip-grafana, --service, --verbose)
   - Classification rules (how to detect each mode from user input)
   - Routing table (which command each mode maps to)

2. core/orchestrator/state-machine.md
   Extract the 9-phase pipeline:
   - Phase 0: Initialize (MCP check, Jira fetch, output dir creation)
   - Phase 1: Bug Context (bug-context agent)
   - Phase 1.5: Artifact Resolution (artifact-resolver agent)
   - Phase 2: Log Analysis (grafana-analyzer agent)
   - Phase 3: Code Analysis (codebase-semantics agent)
   - Phase 4: Parallel Data Fetch (production-analyzer, slack-analyzer, fire-console — launched in parallel)
   - Phase 5-6: Hypothesis Loop (see hypothesis-loop.md)
   - Phase 7: Fix Plan (fix-list agent)
   - Phase 8: Documentation (documenter agent)
   - Phase 9: Publish (publisher agent)
   Include phase transitions, status line updates, and the findings-summary update pattern

3. core/orchestrator/hypothesis-loop.md
   Extract the hypothesis-verification cycle:
   - Generate phase: hypotheses agent produces 2-3 theories
   - Verify phase: verifier agent evaluates with 5-point checklist
     (1. Pinpoint explanation, 2. Why it started, 3. Still in code?, 4. Why it stopped, 5. Evidence complete)
   - Decision phase: CONFIRMED → proceed to fix plan, DECLINED → regather data and retry
   - Max 5 iterations before escalating to user
   - Agent teams mode: Team A vs Team B with skeptic cross-examination
   - Regather logic: what new queries to run when hypothesis is declined

4. core/orchestrator/agent-dispatch.md
   Extract agent execution rules:
   - Sequential phases: 0→1→1.5→2→3 (each waits for previous)
   - Parallel phase: 4 (production-analyzer, slack-analyzer, fire-console launched together)
   - Loop phase: 5↔6 (hypothesis ↔ verification, max 5 iterations)
   - Agent teams: A/B competing hypotheses + skeptic judge
   - Model tiering: haiku for bug-context, artifact-resolver, documenter, publisher; sonnet for all others
   - Data isolation: data agents never see each other's outputs
   - Skill injection: which skill files go to which agents
   - Core design principles (the 11 rules from the top of the file)

5. core/orchestrator/findings-summary-schema.md
   Extract the findings-summary.md format:
   - This is the persistent state file updated after every phase
   - Contains: services under investigation, proven facts, open questions, data collected so far
   - Template/schema for the file
   - Rules for when and how to update it

6. core/orchestrator/recovery-protocol.md
   Extract error handling and recovery:
   - MCP server failure handling (which are critical vs optional)
   - Agent failure handling (retry? skip? escalate?)
   - Mid-investigation resume logic
   - The "fresh start" rule (never read from previous debug-* directories)
   - Fast-fail principle

VALIDATION:
Create core/tests/validate-orchestrator.sh:
- Check all 6 .md files exist in core/orchestrator/
- Check each is non-empty (at least 20 lines — these are substantial documents)
- Make executable

CRITICAL RULES:
- Do NOT modify commands/production-master.md
- Each extracted module should be self-contained and readable independently
- Include cross-references between modules (e.g., "See hypothesis-loop.md for the verification cycle")
- Preserve all specific details: exact checklist items, exact flag names, exact agent names, exact model assignments

Branch: feat/core-orchestrator
Commit: "feat: extract orchestrator modules from monolith command"
```

</details>

`--> PR 1.6`

---

### PR 1.6 — Core CI pipeline

```
Branch: feat/ci-core
```

- [ ] Create `.github/workflows/ci-core.yml`
- [ ] Run `validate-agents.sh`, `validate-skills.sh`, `validate-schema.sh`, `validate-orchestrator.sh`
- [ ] Validate `mcp-servers.json` is valid JSON with 9 servers
- [ ] Check both output style files present
- [ ] Markdown lint on `core/**/*.md`
- [ ] Trigger on changes to `core/**`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 1.6 for the production-master monorepo migration. Your task is to create the CI pipeline for the core/ engine.

CONTEXT:
- core/ now contains: agents/ (12), skills/ (9), orchestrator/ (6), output-styles/ (2), domain/ (3), tests/ (4 scripts), VERSION, mcp-servers.json
- The existing CI is at .github/workflows/ci.yml — read it for style reference
- The existing CI validates plugin.json, marketplace.json, mcp-servers.json, hooks.json, commands, agents, skills, and runs shellcheck

REFERENCE — existing .github/workflows/ci.yml structure:
- Job: validate-plugin (plugin.json, marketplace.json, mcp-servers.json, hooks.json)
- Job: validate-content (commands list, agents list, skills list)
- Job: lint-scripts (shellcheck on .sh files)

TASKS:
Create .github/workflows/ci-core.yml with:

name: CI Core
on:
  push:
    paths: ['core/**']
  pull_request:
    paths: ['core/**']

Jobs:

1. validate-agents:
   - Run core/tests/validate-agents.sh
   - Verify exactly 12 agent files exist

2. validate-skills:
   - Run core/tests/validate-skills.sh
   - Verify exactly 9 skill directories with SKILL.md

3. validate-orchestrator:
   - Run core/tests/validate-orchestrator.sh
   - Verify all 6 orchestrator modules exist and are non-empty

4. validate-schema:
   - Verify core/domain/schema.json is valid JSON
   - Verify core/domain/defaults.json is valid JSON
   - If ajv-cli available, validate Domain/Bookings/Server/scheduler/domain.json against schema
   - Otherwise just validate JSON syntax with jq

5. validate-mcp:
   - Verify core/mcp-servers.json is valid JSON
   - Verify it has exactly 9 servers: jq '.mcpServers | keys | length' should equal 9
   - Verify no real secrets: grep for hex strings 32+ chars, fail if found

6. validate-output-styles:
   - Verify core/output-styles/investigation-report.md exists and is non-empty
   - Verify core/output-styles/publisher-format.md exists and is non-empty

7. lint-markdown (optional, can skip if markdownlint not easy to install):
   - Install markdownlint-cli
   - Run on core/**/*.md

Use ubuntu-latest runner, actions/checkout@v4.
Each job should be independent (all run in parallel).

Branch: feat/ci-core
Commit: "feat: add CI pipeline for core/ engine validation"
```

</details>

`[GATE] Phase 1 complete — core/ fully extracted, all tests pass`

---

## Phase 2: Claude Code Adapter

### PR 2.1 — Scaffold `adapter-claude/` and move Claude-specific files

```
Branch: feat/adapter-claude-scaffold
```

- [ ] Create `adapter-claude/` directory structure
- [ ] Move `.claude-plugin/` to `adapter-claude/.claude-plugin/`
- [ ] Move `hooks/` to `adapter-claude/hooks/`
- [ ] Move `scripts/` to `adapter-claude/scripts/`
- [ ] Create `adapter-claude/README.md`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 2.1 for the production-master monorepo migration. Your task is to create the Claude Code adapter directory and move Claude-specific files into it.

CONTEXT:
- Phase 1 is complete — core/ contains all shared assets
- Now we create adapter-claude/ for Claude Code-specific files
- We use `git mv` to preserve history

FILES TO MOVE:
- .claude-plugin/plugin.json → adapter-claude/.claude-plugin/plugin.json
- .claude-plugin/marketplace.json → adapter-claude/.claude-plugin/marketplace.json
- hooks/hooks.json → adapter-claude/hooks/hooks.json
- scripts/install.sh → adapter-claude/scripts/install.sh
- scripts/validate-install.sh → adapter-claude/scripts/validate-install.sh
- scripts/validate-report-links.sh → adapter-claude/scripts/validate-report-links.sh
- scripts/bump-version.sh → adapter-claude/scripts/bump-version.sh
- scripts/statusline.sh → adapter-claude/scripts/statusline.sh
- scripts/README.md → adapter-claude/scripts/README.md

TASKS:
1. Create adapter-claude/ with subdirectories: .claude-plugin/, hooks/, scripts/, commands/, tests/
2. Use `git mv` to move all files listed above
3. Update the hook command path in adapter-claude/hooks/hooks.json:
   The PostToolUse hook references "${CLAUDE_PLUGIN_ROOT}/scripts/validate-report-links.sh"
   — this path is relative to plugin root, so it should still work. Verify.
4. Create adapter-claude/README.md with:
   - Title: "Production Master — Claude Code Adapter"
   - Brief description: adapter layer for Claude Code plugin surface
   - Reference to core/ for shared engine
   - List of what this adapter contains: plugin manifest, hooks, scripts, commands
5. Do NOT move commands/ yet (that's PR 2.2)
6. Do NOT move agents/ or skills/ (those are in core/)

Branch: feat/adapter-claude-scaffold
Commit: "feat: scaffold adapter-claude/ and move Claude-specific files"
```

</details>

`--> PR 2.2`

---

### PR 2.2 — Refactor commands as thin wrappers referencing `core/`

```
Branch: feat/adapter-claude-commands
```

- [ ] Move `commands/` to `adapter-claude/commands/`
- [ ] Refactor `production-master.md` to reference `core/orchestrator/` modules instead of inlining logic
- [ ] Refactor all 9 commands to reference `core/agents/` and `core/skills/`
- [ ] Ensure `core/` paths are resolvable from Claude Code plugin context
- [ ] Verify: full investigation produces identical results to current behavior

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 2.2 for the production-master monorepo migration. This is a HIGH-COMPLEXITY PR — you must refactor commands to reference core/ modules while maintaining identical behavior.

CONTEXT:
- adapter-claude/ exists with hooks, scripts, plugin manifests (PR 2.1 merged)
- core/ contains agents/, skills/, orchestrator/ modules (Phase 1 complete)
- commands/ at root has 10 files — move them to adapter-claude/commands/

THE 10 COMMANDS:
  production-master.md, grafana-query.md, slack-search.md, production-changes.md,
  resolve-artifact.md, fire-console.md, update-context.md, production-master-report.md,
  git-update-agents.md, sync-cursor.md

TASKS:

1. Use `git mv` to move commands/ to adapter-claude/commands/

2. Refactor adapter-claude/commands/production-master.md:
   The monolith command (~71KB) currently inlines all orchestrator logic.
   Refactor it to REFERENCE the core modules instead:

   BEFORE (inlined):
   "Parse $ARGUMENTS for flags: --skip-slack, --skip-grafana..." (100+ lines of classification)

   AFTER (reference):
   "For intent classification rules, follow core/orchestrator/intent-classifier.md
    For the 9-phase pipeline, follow core/orchestrator/state-machine.md
    For the hypothesis loop, follow core/orchestrator/hypothesis-loop.md
    For agent dispatch rules, follow core/orchestrator/agent-dispatch.md
    For findings summary format, follow core/orchestrator/findings-summary-schema.md
    For error recovery, follow core/orchestrator/recovery-protocol.md"

   CRITICAL: The command must still contain enough context to work — Claude Code reads
   the command file as a prompt. The references must include key details inline AND point
   to the module for full specification. This is a THIN WRAPPER, not an empty redirect.
   Keep: argument parsing, phase overview, agent launch patterns, output directory setup.
   Remove: duplicated detailed specifications that are now in core/orchestrator/.

3. For other commands (grafana-query.md, slack-search.md, etc.):
   - Update agent path references from "agents/" to "core/agents/"
   - Update skill path references from "skills/" to "core/skills/"
   - These are simpler commands that mostly just launch one agent with a skill

4. In Claude Code, plugin paths resolve relative to the plugin root directory.
   The plugin root is the repo root. So "core/agents/grafana-analyzer.md" resolves correctly.
   Verify this by checking that agent references use repo-relative paths.

5. Do NOT change any agent file content or skill file content
6. The sync-cursor.md command can be removed or kept as-is (it was experimental)

TESTING:
After refactoring, a human will manually verify that running /production-master SCHED-XXXXX
produces the same investigation flow. The command must still:
- Parse arguments and classify intent
- Launch the 9-phase pipeline
- Use Task tool with subagent_type: "general-purpose" for each agent
- Pass skill file content to agents that need MCP tools
- Write outputs to .claude/debug/ directory
- Update findings-summary.md after each phase

Branch: feat/adapter-claude-commands
Commit: "feat: refactor commands as thin wrappers referencing core/"
```

</details>

`--> PR 2.3`

---

### PR 2.3 — New Claude hooks + updated install script `||`

```
Branch: feat/adapter-claude-hooks
```

- [ ] Add pre-command safety hook (block dangerous shell commands during investigation)
- [ ] Add MCP call logging hook (log all MCP tool calls to trace file)
- [ ] Add session start MCP connectivity check
- [ ] Update `install.sh` for new monorepo paths
- [ ] Update `validate-install.sh` for new paths

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 2.3 for the production-master monorepo migration. Your task is to add new hooks and update installation scripts.

CONTEXT:
- adapter-claude/hooks/hooks.json currently has 2 hooks:
  - Notification: macOS notification when Claude Code needs attention
  - PostToolUse (Write): runs validate-report-links.sh after Write tool
- Claude Code hooks documentation: https://code.claude.com/docs/en/hooks
- Scripts are now at adapter-claude/scripts/

CURRENT hooks.json:
{
  "hooks": {
    "Notification": [{ "matcher": "", "hooks": [{ "type": "command", "command": "osascript -e '...'" }] }],
    "PostToolUse": [{ "matcher": "Write", "hooks": [{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate-report-links.sh" }] }]
  }
}

TASKS:

1. Add PreToolUse hook for Bash tool — block dangerous commands during investigation:
   {
     "matcher": "Bash",
     "hooks": [{
       "type": "command",
       "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qiE '(rm -rf|git push --force|git reset --hard|DROP TABLE|DELETE FROM)' && echo 'BLOCK: Dangerous command detected during investigation' && exit 2 || exit 0"
     }]
   }
   Note: exit code 2 = block the tool call in Claude Code hooks

2. Add PostToolUse hook for MCP tool calls — log to trace file:
   {
     "matcher": "mcp__",
     "hooks": [{
       "type": "command",
       "command": "echo \"$(date -u +%Y-%m-%dT%H:%M:%SZ) | $CLAUDE_TOOL_NAME | ${CLAUDE_TOOL_INPUT:0:200}\" >> /tmp/.production-master-mcp-trace.log"
     }]
   }

3. Add SessionStart hook — check MCP connectivity:
   This should verify at least one MCP server responds. Create a script
   adapter-claude/scripts/check-mcp-health.sh that:
   - Checks if key MCP servers are configured in ~/.claude.json
   - Prints a warning if no MCP servers found
   - Does NOT block session start (exit 0 always)

4. Update adapter-claude/scripts/install.sh:
   - Update any paths that reference agents/, skills/, commands/ at root
   - They should now reference core/agents/, core/skills/, adapter-claude/commands/
   - Update the plugin path references

5. Update adapter-claude/scripts/validate-install.sh similarly

Branch: feat/adapter-claude-hooks
Commit: "feat: add safety hooks and update install scripts for monorepo"
```

</details>

### PR 2.4 — Claude Code CI pipeline `||`

```
Branch: feat/ci-claude
```

- [ ] Create `.github/workflows/ci-claude.yml`
- [ ] Plugin JSON validation
- [ ] Marketplace JSON validation
- [ ] Command count check (9 commands)
- [ ] Hooks JSON validation
- [ ] Shell script lint
- [ ] Secrets scan
- [ ] Install dry-run test
- [ ] Trigger on changes to `adapter-claude/**` and `core/**`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 2.4 for the production-master monorepo migration. Create the CI pipeline for the Claude Code adapter.

CONTEXT:
- Read .github/workflows/ci.yml for the existing CI style (this is what we're replacing)
- The existing CI checks: plugin.json, marketplace.json, mcp-servers.json, hooks.json, commands, agents, skills, shellcheck
- The NEW ci-claude.yml only checks adapter-claude/ specific things
- Core checks are handled by ci-core.yml (PR 1.6)

TASKS:
Create .github/workflows/ci-claude.yml:

name: CI Claude Code Adapter
on:
  push:
    paths: ['adapter-claude/**', 'core/**']
  pull_request:
    paths: ['adapter-claude/**', 'core/**']

Jobs (all run in parallel on ubuntu-latest with actions/checkout@v4):

1. validate-plugin:
   - Check adapter-claude/.claude-plugin/plugin.json exists and is valid JSON
   - Verify name == "production-master"
   - Verify version is present and not null
   - Check adapter-claude/.claude-plugin/marketplace.json exists and is valid JSON
   - Verify at least 1 plugin defined

2. validate-commands:
   - Check these commands exist in adapter-claude/commands/:
     production-master.md, grafana-query.md, slack-search.md, production-changes.md,
     resolve-artifact.md, fire-console.md, update-context.md, production-master-report.md,
     git-update-agents.md
   - Count total .md files, report count

3. validate-hooks:
   - Check adapter-claude/hooks/hooks.json exists and is valid JSON
   - Verify it contains Notification and PostToolUse hooks

4. lint-scripts:
   - Install shellcheck
   - Run shellcheck --severity=error on:
     adapter-claude/scripts/install.sh
     adapter-claude/scripts/validate-install.sh
     adapter-claude/scripts/validate-report-links.sh
     adapter-claude/scripts/bump-version.sh
     adapter-claude/scripts/statusline.sh

5. secrets-scan:
   - Grep adapter-claude/ for potential secrets (hex strings 32+ chars)
   - Fail if found

Branch: feat/ci-claude
Commit: "feat: add CI pipeline for Claude Code adapter"
```

</details>

### PR 2.5 — Clean up root-level files, update README

```
Branch: feat/cleanup-root
```

- [ ] Remove original `agents/`, `skills/`, `output-styles/`, `commands/`, `hooks/`, `scripts/` from root (now in `core/` and `adapter-claude/`)
- [ ] Update root `README.md` for monorepo structure
- [ ] Update `CLAUDE.md` for new paths
- [ ] Update root `.gitignore`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 2.5 for the production-master monorepo migration. Your task is to clean up the root directory by removing files that have been moved to core/ and adapter-claude/.

CONTEXT:
- agents/ → copied to core/agents/ (PR 1.2)
- skills/ → copied to core/skills/ (PR 1.3)
- output-styles/ → copied to core/output-styles/ (PR 1.4)
- commands/ → moved to adapter-claude/commands/ (PR 2.2, git mv)
- hooks/ → moved to adapter-claude/hooks/ (PR 2.1, git mv)
- scripts/ → moved to adapter-claude/scripts/ (PR 2.1, git mv)
- .claude-plugin/ → moved to adapter-claude/.claude-plugin/ (PR 2.1, git mv)

Note: commands/, hooks/, scripts/, .claude-plugin/ were already git mv'd, so they may already be gone from root.
agents/, skills/, output-styles/ were COPIED (not moved), so originals still exist.

TASKS:

1. Remove these directories from root (use git rm -r):
   - agents/ (now in core/agents/)
   - skills/ (now in core/skills/)
   - output-styles/ (now in core/output-styles/)
   - Verify commands/, hooks/, scripts/, .claude-plugin/ are already gone (if not, remove)

2. Update the existing .github/workflows/ci.yml:
   - Either delete it entirely (replaced by ci-core.yml + ci-claude.yml)
   - Or rename it to ci-legacy.yml and disable it
   - Preferred: delete it with git rm

3. Update root README.md:
   - Update the directory structure section to show the new monorepo layout:
     core/, adapter-claude/, adapter-cursor/ (future), adapter-cloud/ (future), Domain/, docs/, design-docs/
   - Update installation instructions to reference adapter-claude/scripts/install.sh
   - Update command references to adapter-claude/commands/
   - Keep the project description, features list, and MCP server table

4. Update root CLAUDE.md:
   - Update any file path references (agents/ → core/agents/, skills/ → core/skills/, etc.)
   - Add note about monorepo structure
   - Reference core/orchestrator/ for pipeline logic

5. Update .gitignore if needed (no changes likely required)

6. Keep these at root (do NOT delete):
   - mcp-servers.json (the original template — core/ has a copy)
   - cursor-models.json (experimental)
   - Domain/ directory
   - docs/ directory
   - design-docs/ directory
   - README.md, CLAUDE.md, LICENSE, .gitignore

Branch: feat/cleanup-root
Commit: "chore: remove migrated root directories, update README and CLAUDE.md"
```

</details>

`[GATE] Phase 2 complete — Claude Code plugin works identically from monorepo`

---

## Phase 3: Cursor Adapter

> Phase 3 can start after Phase 2 gate.
> PR 3.1-3.4 can run in parallel after PR 3.1 scaffolds the directory.

### PR 3.1 — Scaffold `adapter-cursor/`

```
Branch: feat/adapter-cursor-scaffold
```

- [ ] Create `adapter-cursor/` directory structure
- [ ] Create `.cursor-plugin/plugin.json` manifest
- [ ] Create `adapter-cursor/.mcp.json` with env var placeholders for all 9 MCP servers
- [ ] Create `adapter-cursor/README.md`
- [ ] Symlink `adapter-cursor/skills/` to `core/skills/`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.1 for the production-master monorepo. Your task is to scaffold the Cursor IDE adapter directory.

CONTEXT:
- Cursor plugin docs: https://cursor.com/docs/plugins/building
- Cursor uses .mcp.json for MCP server config (env var based)
- Cursor uses .mdc files for always-on rules
- The repo has 9 MCP servers defined in core/mcp-servers.json

TASKS:

1. Create adapter-cursor/ with subdirectories:
   .cursor-plugin/, rules/, commands/, agents/, hooks/, scripts/, tests/

2. Create adapter-cursor/.cursor-plugin/plugin.json:
   {
     "name": "production-master",
     "description": "Autonomous production investigation pipeline — 12 agents, hypothesis loops, multi-source data collection",
     "version": "1.0.0",
     "author": { "name": "Tamir Cohen" },
     "repository": "https://github.com/TamirCohen-Wix/production-master"
   }

3. Create adapter-cursor/.mcp.json with all 9 MCP servers using env var placeholders:
   {
     "mcpServers": {
       "octocode": {
         "command": "npx", "args": ["-y", "@mcp-s/mcp"],
         "env": { "BASE_URL": "https://mcp-s.wewix.net", "USER_ACCESS_KEY": "${PRODUCTION_MASTER_ACCESS_KEY}", "MCP": "octocode" }
       },
       "Slack": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=slack", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "jira": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=jira", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "grafana-datasource": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=grafana-datasource", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "FT-release": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=gradual-feature-release", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "github": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=github", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "context-7": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=context7", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "grafana-mcp": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=grafana-mcp", "headers": { "x-user-access-key": "${PRODUCTION_MASTER_ACCESS_KEY}" } },
       "fire-console": { "type": "http", "url": "https://mcp-s.wewix.net/mcp?mcp=fire-console" }
     }
   }
   Note: All keys use ${PRODUCTION_MASTER_ACCESS_KEY} env var, NOT hardcoded keys.

4. Create symlink: adapter-cursor/skills → ../core/skills

5. Create adapter-cursor/README.md:
   - Title: "Production Master — Cursor IDE Adapter"
   - Setup instructions: set PRODUCTION_MASTER_ACCESS_KEY env var
   - Reference to core/ for shared engine
   - Note that skills/ is symlinked to core/skills/

Branch: feat/adapter-cursor-scaffold
Commit: "feat: scaffold adapter-cursor/ with plugin manifest and MCP config"
```

</details>

`--> PR 3.2, PR 3.3, PR 3.4, PR 3.5 (all unblocked)`

---

### PR 3.2 — Cursor always-on rules (.mdc) `||`

```
Branch: feat/cursor-rules
```

- [ ] Create `adapter-cursor/rules/investigation-guardrails.mdc` — citation, data isolation, evidence standards
- [ ] Create `adapter-cursor/rules/model-tiering.mdc` — agent-to-model assignments
- [ ] Create `adapter-cursor/rules/output-conventions.mdc` — file naming, directory rules
- [ ] Create `adapter-cursor/rules/mcp-usage.mdc` — MCP tool discovery patterns
- [ ] Validate YAML frontmatter on all `.mdc` files

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.2 for the production-master monorepo. Your task is to create Cursor always-on rules (.mdc files).

CONTEXT:
- Cursor uses .mdc files with YAML frontmatter for always-on rules
- These rules are loaded into every conversation and guide LLM behavior
- Read core/orchestrator/agent-dispatch.md for the design principles to encode
- Read core/agents/ files for model assignments
- The rules replace what CLAUDE.md and agent frontmatter do in Claude Code

.mdc FORMAT:
---
description: Short description of this rule
alwaysApply: true
---

# Rule content in markdown

TASKS — create these 4 files:

1. adapter-cursor/rules/investigation-guardrails.mdc
   ---
   description: Evidence standards and data isolation rules for production investigations
   alwaysApply: true
   ---
   Content should encode these principles from the orchestrator:
   - Citation required: every claim needs a source (file:line, Grafana URL, PR link, etc.)
   - Data isolation: data agents never see each other's outputs
   - Raw data → analysis: data agents report findings only, no hypothesizing
   - Autonomous decisions: don't ask user mid-investigation
   - Fresh start: never read from previous debug-* directories
   - Fast-fail: report MCP failures immediately, no silent retries
   - The 5-point hypothesis checklist

2. adapter-cursor/rules/model-tiering.mdc
   ---
   description: Agent-to-model assignments for cost optimization
   alwaysApply: true
   ---
   Content:
   - Haiku agents: bug-context, artifact-resolver, documenter, publisher
   - Sonnet agents: grafana-analyzer, codebase-semantics, production-analyzer,
     slack-analyzer, hypotheses, verifier, skeptic, fix-list
   - Never use Opus for subagents
   - Explain WHY: haiku for parsing/formatting, sonnet for reasoning

3. adapter-cursor/rules/output-conventions.mdc
   ---
   description: File naming and output directory conventions for investigations
   alwaysApply: true
   ---
   Content:
   - Output directory: .cursor/debug/<ticket-id>-<timestamp>/
   - File pattern: <agent-name>-output-V<N>.md (N = iteration number)
   - Findings summary: findings-summary.md (updated after each phase)
   - Trace files: <agent-name>-trace-V<N>.md
   - Final report: report.md
   - Status file: /tmp/.production-master-status

4. adapter-cursor/rules/mcp-usage.mdc
   ---
   description: MCP tool discovery and usage patterns
   alwaysApply: true
   ---
   Content:
   - 9 MCP servers available (list them with tool counts)
   - Tool naming: mcp__<server>__<tool_name>
   - Skill files in core/skills/<server>/SKILL.md contain full tool documentation
   - Always read the skill file before using an MCP tool
   - fire-console requires no auth header (different from others)

Branch: feat/cursor-rules
Commit: "feat: create Cursor always-on rules (.mdc files)"
```

</details>

### PR 3.3 — Cursor commands (adapt from Claude) `||`

```
Branch: feat/cursor-commands
```

- [ ] Create all 9 commands in `adapter-cursor/commands/`, adapted for Cursor subagent dispatch
- [ ] Adapt `production-master.md` for sequential hypothesis loop (no agent teams)
- [ ] Reference `core/orchestrator/` modules
- [ ] Reference `core/agents/` definitions

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.3 for the production-master monorepo. Your task is to create Cursor-adapted versions of all commands.

CONTEXT:
- Read adapter-claude/commands/ for the Claude Code versions
- Cursor uses subagent dispatch differently from Claude Code's Task tool
- Cursor does NOT support agent teams (no competing A/B hypotheses)
- The hypothesis loop must be sequential: hypotheses → verifier → decision → (loop or proceed)
- Commands reference core/orchestrator/ modules and core/agents/

KEY DIFFERENCES FROM CLAUDE CODE:
1. No Task tool — Cursor uses its own subagent dispatch mechanism
2. No agent teams — skip the skeptic agent, use sequential hypothesis loop
3. Cursor subagents receive context differently — they can read files directly
4. .mdc rules handle guardrails (no need to repeat in command)
5. Output goes to .cursor/debug/ instead of .claude/debug/

TASKS:

1. Create adapter-cursor/commands/production-master.md:
   - Same 9-phase pipeline, but adapted for Cursor
   - Reference core/orchestrator/ modules for logic
   - Hypothesis loop: one hypothesis agent → one verifier → decision (no teams)
   - Max 5 iterations of the loop
   - Output to .cursor/debug/<ticket>-<timestamp>/

2. Create these commands (adapt from Claude versions):
   - grafana-query.md — direct Grafana log/metric queries
   - slack-search.md — Slack search
   - production-changes.md — PR/commit/toggle search
   - resolve-artifact.md — service artifact validation
   - fire-console.md — gRPC domain queries
   - update-context.md — domain config creation
   - production-master-report.md — GitHub issue submission
   - git-update-agents.md — agent sync to repo

3. For each command:
   - Reference core/agents/<agent>.md for agent definitions
   - Reference core/skills/<skill>/SKILL.md for MCP tool docs
   - Use Cursor subagent dispatch patterns (not Claude Code Task tool)
   - Use output paths relative to .cursor/ not .claude/

Branch: feat/cursor-commands
Commit: "feat: create Cursor-adapted commands with sequential hypothesis loop"
```

</details>

### PR 3.4 — Cursor agent configs `||`

```
Branch: feat/cursor-agents
```

- [ ] Create 11 agent config files in `adapter-cursor/agents/` (no skeptic — sequential mode)
- [ ] Each references the corresponding `core/agents/*.md` definition
- [ ] Adapt for Cursor subagent execution model

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.4 for the production-master monorepo. Your task is to create Cursor agent config files.

CONTEXT:
- Read core/agents/ for the 12 canonical agent definitions
- Cursor does NOT support agent teams → skip the skeptic agent (11 agents)
- Each Cursor agent config should reference the core definition and add Cursor-specific metadata
- Cursor agent configs are .md files with frontmatter

TASKS:

Create 11 agent files in adapter-cursor/agents/ (all EXCEPT skeptic.md):

For each agent, create a .md file with this structure:
---
name: <agent-name>
description: <description from core>
model: <haiku or sonnet — same as core>
tools: <tool list from core agent>
---

# <Agent Name>

This agent follows the definition in `core/agents/<agent-name>.md`.

## Cursor-Specific Adaptations
- [any Cursor-specific notes]

THE 11 AGENTS (with their models):
  bug-context (haiku), artifact-resolver (haiku), grafana-analyzer (sonnet),
  codebase-semantics (sonnet), production-analyzer (sonnet), slack-analyzer (sonnet),
  hypotheses (sonnet), verifier (sonnet), fix-list (sonnet),
  documenter (haiku), publisher (haiku)

IMPORTANT:
- Do NOT create skeptic.md — it's only used in agent teams mode (Claude Code only)
- Each file should be thin — just reference core/agents/ and note any Cursor differences
- The tool lists should match core definitions exactly

Branch: feat/cursor-agents
Commit: "feat: create Cursor agent configs referencing core definitions"
```

</details>

### PR 3.5 — Cursor hooks `||`

```
Branch: feat/cursor-hooks
```

- [ ] Create `adapter-cursor/hooks/hooks.json` with 19+ lifecycle events
- [ ] Implement `postToolUseFailure` MCP error recovery hook
- [ ] Implement `beforeShellExecution` dangerous command blocker
- [ ] Implement link validation hook (adapted from Claude)

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.5 for the production-master monorepo. Your task is to create Cursor hooks.

CONTEXT:
- Cursor supports these hook events (among others):
  SessionStart, SessionEnd, PreToolUse, PostToolUse, PostToolUseFailure,
  BeforeShellExecution, AfterShellExecution, Notification, FileCreate, FileEdit,
  FileDelete, SubagentStart, SubagentEnd, StopRequest, and more
- Read adapter-claude/hooks/hooks.json for the Claude Code version (simpler — 2 hooks)
- Cursor hooks use the same JSON format as Claude Code hooks

TASKS:

Create adapter-cursor/hooks/hooks.json with these hooks:

1. Notification — same as Claude (macOS notification):
   { "matcher": "", "hooks": [{ "type": "command", "command": "osascript -e '...'" }] }

2. PostToolUse (Write) — link validation:
   { "matcher": "Write", "hooks": [{ "type": "command", "command": "${CURSOR_PLUGIN_ROOT}/scripts/validate-report-links.sh" }] }
   Note: create adapter-cursor/scripts/validate-report-links.sh (copy from adapter-claude, update paths)

3. PostToolUseFailure (mcp__) — MCP error recovery:
   { "matcher": "mcp__", "hooks": [{ "type": "command",
     "command": "echo '[MCP RECOVERY] Tool $CLAUDE_TOOL_NAME failed. Check MCP server connectivity.' >> /tmp/.production-master-mcp-errors.log" }] }

4. PreToolUse (Bash) — dangerous command blocker:
   { "matcher": "Bash", "hooks": [{ "type": "command",
     "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -qiE '(rm -rf|git push --force|git reset --hard|DROP TABLE)' && echo 'BLOCK: Dangerous command' && exit 2 || exit 0" }] }

5. SessionStart — MCP connectivity check:
   { "matcher": "", "hooks": [{ "type": "command",
     "command": "echo 'Production Master Cursor adapter loaded. $(date)' >> /tmp/.production-master-session.log" }] }

Also create:
- adapter-cursor/scripts/validate-report-links.sh (copy from adapter-claude, adapt paths)

Branch: feat/cursor-hooks
Commit: "feat: create Cursor hooks with MCP recovery and safety checks"
```

</details>

`--> PR 3.6`

---

### PR 3.6 — Cursor CI pipeline + install script

```
Branch: feat/ci-cursor
```

- [ ] Create `.github/workflows/ci-cursor.yml`
- [ ] Plugin JSON validation
- [ ] Rule frontmatter validation
- [ ] Command count check
- [ ] Agent config check
- [ ] `.mcp.json` validation (9 servers, env var placeholders, no real keys)
- [ ] Hooks JSON validation
- [ ] Skill symlinks check
- [ ] Create `adapter-cursor/scripts/install.sh`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.6 for the production-master monorepo. Create the Cursor CI pipeline and install script.

TASKS:

1. Create .github/workflows/ci-cursor.yml:
   name: CI Cursor Adapter
   on:
     push: { paths: ['adapter-cursor/**', 'core/**'] }
     pull_request: { paths: ['adapter-cursor/**', 'core/**'] }

   Jobs (ubuntu-latest, actions/checkout@v4):

   a. validate-plugin: check .cursor-plugin/plugin.json is valid JSON with name="production-master"
   b. validate-rules: for each .mdc file in adapter-cursor/rules/, verify YAML frontmatter
      contains "description" and "alwaysApply: true" (use grep or simple parser)
   c. validate-commands: verify 9 expected .md files exist in adapter-cursor/commands/
   d. validate-agents: verify 11 .md files exist in adapter-cursor/agents/ (no skeptic)
   e. validate-mcp-json: check adapter-cursor/.mcp.json is valid JSON, has 9 servers,
      contains "${PRODUCTION_MASTER_ACCESS_KEY}" placeholders (not real keys),
      grep for hex strings 32+ chars → fail if found
   f. validate-hooks: check adapter-cursor/hooks/hooks.json is valid JSON
   g. validate-symlinks: check adapter-cursor/skills is a symlink pointing to ../core/skills,
      and the target resolves (use test -L and test -d)

2. Create adapter-cursor/scripts/install.sh:
   - Interactive installer for Cursor
   - Prompt user for PRODUCTION_MASTER_ACCESS_KEY
   - Set it as env var in shell profile (~/.zshrc or ~/.bashrc)
   - Verify Cursor IDE is installed
   - Symlink or copy the adapter to Cursor's plugin directory
   - Print success message with next steps
   - Make executable (chmod +x)

Branch: feat/ci-cursor
Commit: "feat: add Cursor CI pipeline and install script"
```

</details>

`--> PR 3.7`

---

### PR 3.7 — Cursor end-to-end validation + marketplace submission

```
Branch: feat/cursor-e2e
```

- [ ] Run full investigation in Cursor IDE
- [ ] Verify all 4 `.mdc` rules load correctly
- [ ] Verify sequential hypothesis loop works
- [ ] Verify all MCP tools accessible
- [ ] Create marketplace submission assets (logo SVG, description)
- [ ] Submit to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 3.7 for the production-master monorepo. This is a manual validation + marketplace submission PR.

TASKS:

1. Create adapter-cursor/assets/logo.svg — a simple SVG logo for the marketplace
   (shield or terminal icon with "PM" text, minimal design, works at 64x64 and 256x256)

2. Create adapter-cursor/MARKETPLACE.md — marketplace listing description:
   - Title: Production Master
   - Tagline: "Autonomous production investigation pipeline"
   - Features list: 12 agents, 9 MCP integrations, hypothesis loops, multi-source data
   - Screenshots section (placeholder paths)
   - Requirements: PRODUCTION_MASTER_ACCESS_KEY env var

3. Manual testing checklist (document results in PR description):
   - [ ] Open Cursor IDE with adapter-cursor/ as plugin
   - [ ] Verify .mdc rules appear in Cursor settings
   - [ ] Run /production-master SCHED-XXXXX
   - [ ] Verify phases execute sequentially
   - [ ] Verify hypothesis loop runs without agent teams
   - [ ] Verify MCP tools are callable (test grafana-datasource, jira, slack)
   - [ ] Verify output files written to .cursor/debug/
   - [ ] Compare report quality against Claude Code output

4. Submit to Cursor marketplace at cursor.com/marketplace/publish
   (document the submission in PR description)

Branch: feat/cursor-e2e
Commit: "feat: add marketplace assets and validate Cursor end-to-end"
```

</details>

`[GATE] Phase 3 complete — Cursor plugin on marketplace`

---

## Phase 4: Cloud Pipeline MVP

> Phase 4 can start after Phase 2 gate (parallel with Phase 3).
> Multiple workstreams run in parallel.

### PR 4.1 — Scaffold `adapter-cloud/` + project setup

```
Branch: feat/adapter-cloud-scaffold
```

- [ ] Create `adapter-cloud/` directory structure
- [ ] Initialize `package.json` with TypeScript, Express/Fastify, Zod
- [ ] Create `tsconfig.json`
- [ ] Create `Dockerfile` (multi-stage build)
- [ ] Create `docker-compose.yml` (local dev stack: app + postgres + redis)
- [ ] Create `adapter-cloud/README.md`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.1 for the production-master monorepo. Your task is to scaffold the cloud pipeline TypeScript project.

TASKS:

1. Create adapter-cloud/ with this directory structure:
   src/api/routes/, src/api/middleware/, src/api/webhooks/
   src/orchestrator/, src/workers/, src/mcp/, src/storage/models/
   src/observability/, src/config/
   helm/templates/, migrations/, tests/unit/, tests/integration/, tests/e2e/

2. Create adapter-cloud/package.json:
   {
     "name": "@production-master/cloud",
     "version": "1.0.0-alpha.1",
     "private": true,
     "scripts": {
       "dev": "tsx watch src/api/server.ts",
       "build": "tsc",
       "start": "node dist/api/server.js",
       "test": "vitest run",
       "test:watch": "vitest",
       "lint": "eslint src/",
       "typecheck": "tsc --noEmit",
       "migrate": "node scripts/migrate.js"
     },
     "dependencies": {
       "@anthropic-ai/sdk": "^0.39.0",
       "@modelcontextprotocol/sdk": "^1.12.0",
       "express": "^4.21.0", "zod": "^3.24.0",
       "pg": "^8.13.0", "ioredis": "^5.4.0",
       "@aws-sdk/client-s3": "^3.700.0",
       "bullmq": "^5.30.0", "jsonwebtoken": "^9.0.0",
       "@opentelemetry/sdk-node": "^0.57.0",
       "@opentelemetry/api": "^1.9.0",
       "prom-client": "^15.1.0", "winston": "^3.17.0"
     },
     "devDependencies": {
       "typescript": "^5.7.0", "tsx": "^4.19.0",
       "@types/express": "^5.0.0", "@types/pg": "^8.11.0",
       "@types/jsonwebtoken": "^9.0.0", "@types/node": "^22.0.0",
       "vitest": "^3.0.0", "eslint": "^9.17.0",
       "@typescript-eslint/eslint-plugin": "^8.18.0"
     }
   }

3. Create adapter-cloud/tsconfig.json:
   Strict mode, ES2022 target, NodeNext module, outDir: ./dist, rootDir: ./src

4. Create adapter-cloud/Dockerfile (multi-stage):
   Stage 1 (builder): node:22-alpine, copy package*.json, npm ci, copy src/, tsc build
   Stage 2 (runner): node:22-alpine, copy dist/ and node_modules from builder,
     expose 3000, CMD ["node", "dist/api/server.js"]

5. Create adapter-cloud/docker-compose.yml:
   Services: app (build: ., ports: 3000, depends_on: postgres, redis),
   postgres (postgres:16-alpine, port 5432, POSTGRES_DB: production_master),
   redis (redis:7-alpine, port 6379)

6. Create adapter-cloud/README.md with setup instructions

7. Run: cd adapter-cloud && npm install (generate package-lock.json)
8. Add node_modules/ to .gitignore if not already there

Branch: feat/adapter-cloud-scaffold
Commit: "feat: scaffold adapter-cloud/ TypeScript project"
```

</details>

`--> PR 4.2, PR 4.3, PR 4.4, PR 4.5 (all unblocked)`

---

### PR 4.2 — Database schema + migrations `||`

```
Branch: feat/cloud-database
```

- [ ] Create `migrations/001_create_investigations.sql`
- [ ] Create `migrations/002_create_agent_runs.sql`
- [ ] Create `migrations/003_create_domain_configs.sql`
- [ ] Create `migrations/004_create_incident_embeddings.sql`
- [ ] Create `src/storage/db.ts` — PostgreSQL client
- [ ] Create `src/storage/models/investigation.ts`
- [ ] Create `src/storage/models/agent-run.ts`
- [ ] Create `src/storage/models/domain-config.ts`
- [ ] Create `src/storage/object-store.ts` — S3/GCS client for reports
- [ ] Create `src/storage/cache.ts` — Redis client

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.2 for the production-master cloud pipeline. Create the database schema, migrations, and storage layer.

ALL PATHS ARE RELATIVE TO adapter-cloud/

TASKS:

1. Create migrations/001_create_investigations.sql:
   CREATE TABLE investigations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id VARCHAR(50) NOT NULL,
     domain VARCHAR(100),
     status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
     phase INTEGER DEFAULT 0,  -- current pipeline phase (0-9)
     verdict VARCHAR(20),  -- CONFIRMED, DECLINED, INCONCLUSIVE
     confidence DECIMAL(3,2),
     trigger_source VARCHAR(50),  -- api, jira_webhook, slack_command, pagerduty, grafana_alert
     report_url TEXT,
     findings_summary JSONB,
     error TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   );
   CREATE INDEX idx_investigations_ticket ON investigations(ticket_id);
   CREATE INDEX idx_investigations_status ON investigations(status);

2. Create migrations/002_create_agent_runs.sql:
   CREATE TABLE agent_runs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     investigation_id UUID REFERENCES investigations(id),
     agent_name VARCHAR(50) NOT NULL,
     phase INTEGER NOT NULL,
     model VARCHAR(20) NOT NULL,  -- haiku, sonnet
     status VARCHAR(20) NOT NULL DEFAULT 'pending',
     input_tokens INTEGER,
     output_tokens INTEGER,
     duration_ms INTEGER,
     output_path TEXT,
     error TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   );
   CREATE INDEX idx_agent_runs_investigation ON agent_runs(investigation_id);

3. Create migrations/003_create_domain_configs.sql:
   CREATE TABLE domain_configs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     repo VARCHAR(200) NOT NULL UNIQUE,
     config JSONB NOT NULL,  -- the full domain.json content
     claude_md TEXT,  -- optional CLAUDE.md content
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

4. Create migrations/004_create_incident_embeddings.sql:
   CREATE TABLE incident_embeddings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     investigation_id UUID REFERENCES investigations(id),
     embedding vector(1536),  -- requires pgvector extension (Phase 6)
     summary TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   -- Note: pgvector extension must be enabled: CREATE EXTENSION IF NOT EXISTS vector;

5. Create src/storage/db.ts:
   - Use pg Pool with connection string from env DATABASE_URL
   - Export query helper, transaction helper
   - Connection pool config: max 20, idleTimeoutMillis 30000

6. Create src/storage/models/investigation.ts:
   - TypeScript interface matching investigations table
   - CRUD functions: create, getById, updatePhase, updateVerdict, updateStatus, list

7. Create src/storage/models/agent-run.ts:
   - TypeScript interface matching agent_runs table
   - CRUD functions: create, getByInvestigation, updateStatus, updateTokens

8. Create src/storage/models/domain-config.ts:
   - TypeScript interface matching domain_configs table
   - CRUD functions: create, getByRepo, update, list
   - Import and validate against core/domain/schema.json

9. Create src/storage/object-store.ts:
   - S3 client using @aws-sdk/client-s3
   - Functions: uploadReport(investigationId, content), getReport(investigationId)
   - Bucket from env S3_BUCKET, region from env AWS_REGION

10. Create src/storage/cache.ts:
    - Redis client using ioredis
    - Functions: getInvestigationState, setInvestigationState (TTL 1 hour)
    - Connection from env REDIS_URL

Branch: feat/cloud-database
Commit: "feat: add database schema, migrations, and storage layer"
```

</details>

### PR 4.3 — MCP client layer `||`

```
Branch: feat/cloud-mcp-client
```

- [ ] Create `src/mcp/client.ts` — HTTP MCP client (for mcp-s.wewix.net servers)
- [ ] Create `src/mcp/stdio-client.ts` — stdio MCP client (for Octocode)
- [ ] Create `src/mcp/registry.ts` — server registry and health checks
- [ ] Create `src/config/mcp-config.yaml` — MCP server configuration
- [ ] Implement service-account authentication via Vault path
- [ ] Unit tests for MCP client

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.3 for the production-master cloud pipeline. Create the MCP client layer.

ALL PATHS ARE RELATIVE TO adapter-cloud/

CONTEXT — the 9 MCP servers (from core/mcp-servers.json):
  HTTP servers (via mcp-s.wewix.net): Slack, jira, grafana-datasource, FT-release, github, context-7, grafana-mcp, fire-console
  stdio server: octocode (via npx @mcp-s/mcp)
  Auth: x-user-access-key header (HTTP) or USER_ACCESS_KEY env (stdio)
  fire-console has NO auth header

TASKS:

1. Create src/mcp/client.ts — HTTP MCP client:
   - Use @modelcontextprotocol/sdk Client class
   - Streamable HTTP transport to mcp-s.wewix.net
   - Methods: connect(), callTool(name, args), listTools(), disconnect()
   - Add x-user-access-key header from config
   - Retry logic: 3 retries with exponential backoff (1s, 2s, 4s)
   - Timeout: 30 seconds per call
   - Circuit breaker: after 5 consecutive failures, mark server unhealthy for 60s

2. Create src/mcp/stdio-client.ts — stdio MCP client:
   - For Octocode only (runs as npx subprocess)
   - Use StdioClientTransport from @modelcontextprotocol/sdk
   - Spawn: npx -y @mcp-s/mcp with env vars BASE_URL, USER_ACCESS_KEY, MCP=octocode
   - Same interface as HTTP client

3. Create src/mcp/registry.ts — server registry:
   - Load server config from src/config/mcp-config.yaml
   - Track health status per server (healthy/unhealthy/unknown)
   - Health check: call listTools() on each server
   - getClient(serverName) → returns configured client
   - listServers() → returns all with health status

4. Create src/config/mcp-config.yaml:
   servers:
     grafana-datasource:
       type: http
       url: https://mcp-s.wewix.net/mcp?mcp=grafana-datasource
       auth: vault://secret/production-master/mcp-access-key
     slack:
       type: http
       url: https://mcp-s.wewix.net/mcp?mcp=slack
       auth: vault://secret/production-master/mcp-access-key
     # ... all 9 servers
     octocode:
       type: stdio
       command: npx
       args: ["-y", "@mcp-s/mcp"]
       auth: vault://secret/production-master/mcp-access-key
     fire-console:
       type: http
       url: https://mcp-s.wewix.net/mcp?mcp=fire-console
       auth: none

5. Auth resolution: if auth starts with "vault://", read from VAULT_ADDR + path.
   For local dev, fall back to MCP_ACCESS_KEY env var.

6. Unit tests in tests/unit/mcp/:
   - Test client retry logic with mock server
   - Test circuit breaker behavior
   - Test registry health checks

Branch: feat/cloud-mcp-client
Commit: "feat: add MCP client layer with HTTP and stdio transports"
```

</details>

### PR 4.4 — Agent worker + Anthropic API integration `||`

```
Branch: feat/cloud-agent-worker
```

- [ ] Create `src/workers/agent-runner.ts` — LLM API call + MCP tool execution
- [ ] Create `src/workers/tool-handler.ts` — MCP tool call handler
- [ ] Create `src/workers/prompt-builder.ts` — agent prompt construction from `core/agents/`
- [ ] Create `src/config/models.yaml` — LLM model configuration (tiering)
- [ ] Integrate with Anthropic Messages API
- [ ] Unit tests for prompt builder and tool handler

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.4 for the production-master cloud pipeline. Create the agent worker that executes LLM calls with MCP tool use.

ALL PATHS ARE RELATIVE TO adapter-cloud/

CONTEXT:
- Agents are defined as .md files in core/agents/ (12 agents)
- Each agent has: name, description, model (haiku/sonnet), allowed tools
- The worker reads the agent .md file, builds a prompt, calls Anthropic Messages API,
  handles tool_use responses by calling MCP servers, and loops until done
- This is the cloud equivalent of Claude Code's Task tool

TASKS:

1. Create src/workers/prompt-builder.ts:
   - readAgentDefinition(agentName): reads core/agents/<name>.md, parses frontmatter
   - buildPrompt(agentName, context): combines agent definition + investigation context
     Context includes: bug context, previous phase outputs, findings summary, skill file content
   - injectSkillContent(agentName): reads the relevant core/skills/<skill>/SKILL.md files
     and appends them to the system prompt
   - Agent-to-skill mapping:
     grafana-analyzer → grafana-datasource, grafana-mcp
     codebase-semantics → octocode
     slack-analyzer → slack
     production-analyzer → github, ft-release
     bug-context → (none, uses jira data passed in context)
     artifact-resolver → grafana-datasource
     hypotheses → fire-console
     verifier → fire-console
     fix-list → ft-release
     publisher → jira, slack

2. Create src/workers/tool-handler.ts:
   - handleToolUse(toolCall, mcpRegistry): routes tool calls to the correct MCP server
   - Tool names from Anthropic API come as tool_use blocks with name and input
   - Map tool names to MCP server + tool name
   - Call mcpRegistry.getClient(server).callTool(toolName, args)
   - Return tool result back to the LLM

3. Create src/workers/agent-runner.ts:
   - runAgent(agentName, context, options): main execution function
   - Uses @anthropic-ai/sdk Anthropic client
   - Model selection from config: haiku → claude-haiku-4-5-20251001, sonnet → claude-sonnet-4-6
   - Agentic loop:
     a. Call messages.create with system prompt + user message + tools
     b. If response has tool_use, call handleToolUse, append result, call again
     c. Loop until response has no more tool_use (or max 50 iterations)
     d. Return final text response
   - Track token usage (input_tokens, output_tokens) per call
   - Write agent output to storage (S3)
   - Record agent run in database

4. Create src/config/models.yaml:
   models:
     haiku:
       id: claude-haiku-4-5-20251001
       max_tokens: 4096
       agents: [bug-context, artifact-resolver, documenter, publisher]
     sonnet:
       id: claude-sonnet-4-6
       max_tokens: 8192
       agents: [grafana-analyzer, codebase-semantics, production-analyzer,
                slack-analyzer, hypotheses, verifier, skeptic, fix-list]

5. Unit tests:
   - Test prompt-builder with a mock agent file
   - Test tool-handler with mock MCP responses
   - Test agent-runner loop with mock Anthropic API (return tool_use then text)

Branch: feat/cloud-agent-worker
Commit: "feat: add agent worker with Anthropic API and MCP tool handling"
```

</details>

### PR 4.5 — Observability setup `||`

```
Branch: feat/cloud-observability
```

- [ ] Create `src/observability/tracing.ts` — OpenTelemetry setup
- [ ] Create `src/observability/metrics.ts` — Prometheus metrics (12 metrics from spec)
- [ ] Create `src/observability/logging.ts` — structured JSON logging

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.5 for the production-master cloud pipeline. Create the observability stack.

ALL PATHS ARE RELATIVE TO adapter-cloud/

TASKS:

1. Create src/observability/tracing.ts:
   - Initialize OpenTelemetry NodeSDK with OTLP exporter
   - Auto-instrument HTTP, pg, ioredis
   - Export: initTracing(), getTracer(name)
   - Env vars: OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME=production-master

2. Create src/observability/metrics.ts using prom-client:
   Define these 12 metrics (from design-docs/04-implementation-plan.md Section 15):
   - pm_investigation_total (Counter, labels: domain, mode, trigger)
   - pm_investigation_duration_seconds (Histogram, labels: domain, verdict)
   - pm_investigation_verdict (Counter, labels: domain, verdict)
   - pm_agent_duration_seconds (Histogram, labels: agent, model)
   - pm_agent_tokens_total (Counter, labels: agent, model, direction)
   - pm_mcp_call_duration_seconds (Histogram, labels: server, tool)
   - pm_mcp_call_errors_total (Counter, labels: server, tool, error)
   - pm_hypothesis_iterations (Histogram, labels: domain)
   - pm_hypothesis_confidence (Histogram, labels: domain)
   - pm_llm_cost_dollars (Counter, labels: model)
   - pm_queue_depth (Gauge, labels: priority)
   - pm_worker_utilization (Gauge)
   Export: initMetrics(), getMetricsEndpoint() → returns /metrics handler

3. Create src/observability/logging.ts:
   - Use winston with JSON format
   - Log levels: error, warn, info, debug
   - Include: timestamp, level, message, investigation_id (from async context), trace_id
   - Export: createLogger(module), log

Branch: feat/cloud-observability
Commit: "feat: add OpenTelemetry tracing, Prometheus metrics, structured logging"
```

</details>

`--> PR 4.6`

---

### PR 4.6 — REST API server + orchestrator engine

```
Branch: feat/cloud-api-server
```

- [ ] Create `src/api/server.ts` — Express/Fastify server
- [ ] Create `src/api/routes/investigate.ts` — `POST /api/v1/investigate`
- [ ] Create `src/api/routes/investigations.ts` — `GET /api/v1/investigations/:id`
- [ ] Create `src/api/routes/queries.ts` — direct query endpoints
- [ ] Create `src/api/routes/domains.ts` — domain config CRUD
- [ ] Create `src/api/routes/health.ts` — health and metrics endpoint
- [ ] Create `src/api/middleware/auth.ts` — API key + JWT auth
- [ ] Create `src/api/middleware/rate-limit.ts`
- [ ] Create `src/api/middleware/validation.ts` — request validation (Zod)
- [ ] Create `src/orchestrator/engine.ts` — state machine implementation
- [ ] Create `src/orchestrator/dispatcher.ts` — agent job dispatch
- [ ] Create `src/orchestrator/hypothesis-loop.ts` — hypothesis iteration logic
- [ ] Integration tests with mock MCP + mock Anthropic API

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.6 for the production-master cloud pipeline. This is the LARGEST PR — the REST API server and orchestrator engine. Read design-docs/03-cloud-pipeline.md and design-docs/04-implementation-plan.md Sections 6 and 9 for full specifications.

ALL PATHS ARE RELATIVE TO adapter-cloud/
DEPENDS ON: PR 4.2 (storage), PR 4.3 (MCP client), PR 4.4 (agent worker), PR 4.5 (observability)

TASKS:

1. src/api/server.ts — Express server:
   - Import all routes, middleware, observability
   - Initialize tracing, metrics, database pool
   - Mount routes under /api/v1/
   - Mount /metrics for Prometheus scraping
   - Graceful shutdown (close DB pool, disconnect MCP clients)
   - Listen on PORT env var (default 3000)

2. src/api/middleware/auth.ts:
   - Support two auth methods: API key (x-api-key header) and JWT (Authorization: Bearer)
   - API keys stored in env API_KEYS (comma-separated)
   - JWT verified with JWT_SECRET env var
   - Attach user context to request

3. src/api/middleware/rate-limit.ts:
   - In-memory rate limiter (or Redis-based)
   - 10 investigations per minute per API key
   - 100 query requests per minute per API key

4. src/api/middleware/validation.ts:
   - Zod schemas for each endpoint's request body
   - Return 400 with validation errors

5. src/api/routes/investigate.ts:
   POST /api/v1/investigate
   Body: { ticket_id: string, domain?: string, mode?: "fast"|"balanced"|"deep", callback_url?: string }
   - Validate input
   - Check deduplication (same ticket in last 1h → return existing investigation)
   - Create investigation record in DB
   - Enqueue to BullMQ job queue
   - Return 202 { investigation_id, status: "pending" }

6. src/api/routes/investigations.ts:
   GET /api/v1/investigations/:id — return investigation status, phase, verdict
   GET /api/v1/investigations/:id/report — return full report (from S3)
   GET /api/v1/investigations — list investigations (with pagination, filters)

7. src/api/routes/queries.ts:
   POST /api/v1/query/logs — direct Grafana query (wraps grafana-analyzer agent)
   POST /api/v1/query/slack — direct Slack search
   POST /api/v1/query/changes — direct production changes search

8. src/api/routes/domains.ts:
   CRUD for domain configs:
   GET /api/v1/domains — list all
   GET /api/v1/domains/:repo — get by repo name
   POST /api/v1/domains — create (validate against core/domain/schema.json)
   PUT /api/v1/domains/:repo — update
   DELETE /api/v1/domains/:repo — delete

9. src/api/routes/health.ts:
   GET /health — basic liveness
   GET /ready — readiness (DB connected, at least 1 MCP server healthy)

10. src/orchestrator/engine.ts — state machine:
    - Implements the 9-phase pipeline from core/orchestrator/state-machine.md
    - Processes investigation jobs from BullMQ queue
    - For each phase: dispatch agent(s) via agent-runner, update DB, update findings summary
    - Phase 4: launch production-analyzer, slack-analyzer in parallel (Promise.all)
    - On completion: upload report to S3, update DB, call callback_url if provided

11. src/orchestrator/dispatcher.ts:
    - dispatchAgent(investigationId, agentName, context): calls agent-runner.runAgent()
    - Records agent run in DB (start time, status)
    - Updates with results (tokens, duration, output path)

12. src/orchestrator/hypothesis-loop.ts:
    - Implements the hypothesis-verification cycle from core/orchestrator/hypothesis-loop.md
    - Generate: run hypotheses agent
    - Verify: run verifier agent with 5-point checklist
    - Decision: CONFIRMED → proceed, DECLINED → regather and retry
    - Max 5 iterations
    - Support agent teams: run two hypothesis agents in parallel, then skeptic

13. Integration tests in tests/integration/:
    - Mock MCP server (return canned responses)
    - Mock Anthropic API (return canned tool_use then text)
    - Test: POST /investigate → poll status → verify completed
    - Test: hypothesis loop with 2 iterations

Branch: feat/cloud-api-server
Commit: "feat: add REST API server and orchestrator engine"
```

</details>

`--> PR 4.7`

---

### PR 4.7 — Helm charts + CI pipeline

```
Branch: feat/cloud-helm-ci
```

- [ ] Create `helm/Chart.yaml`
- [ ] Create `helm/values.yaml`, `values-staging.yaml`, `values-production.yaml`
- [ ] Create Helm templates: deployment-api, deployment-orchestrator, deployment-worker, service, ingress, hpa, configmap, secret, cronjob
- [ ] Create `.github/workflows/ci-cloud.yml`
  - [ ] TypeScript lint (ESLint)
  - [ ] TypeScript compile (`tsc --noEmit`)
  - [ ] Unit tests
  - [ ] Dockerfile lint (hadolint)
  - [ ] Docker build
  - [ ] Helm lint
  - [ ] SQL migrations lint
  - [ ] Security scan (trivy)
  - [ ] Integration tests

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.7 for the production-master cloud pipeline. Create Helm charts and the CI pipeline.

ALL PATHS ARE RELATIVE TO adapter-cloud/

TASKS:

1. Create helm/Chart.yaml:
   apiVersion: v2
   name: production-master
   version: 1.0.0-alpha.1
   appVersion: "1.0.0"
   description: Production Master cloud investigation pipeline

2. Create helm/values.yaml (defaults):
   replicaCount: {api: 2, orchestrator: 1, worker: 3}
   image: {repository: production-master, tag: latest, pullPolicy: IfNotPresent}
   service: {type: ClusterIP, port: 3000}
   ingress: {enabled: true, host: production-master.internal}
   resources: {api: {cpu: 500m, memory: 512Mi}, worker: {cpu: 1000m, memory: 1Gi}}
   env: {DATABASE_URL, REDIS_URL, S3_BUCKET, ANTHROPIC_API_KEY (from secret), VAULT_ADDR}
   hpa: {enabled: true, minReplicas: 1, maxReplicas: 10, targetCPU: 70}

3. Create helm/values-staging.yaml: replicaCount overrides (1 each), staging host
4. Create helm/values-production.yaml: production replicas, production host, higher resource limits

5. Create Helm templates:
   - templates/deployment-api.yaml — API server deployment
   - templates/deployment-orchestrator.yaml — queue consumer
   - templates/deployment-worker.yaml — agent workers (scalable)
   - templates/service.yaml — ClusterIP service
   - templates/ingress.yaml — Ingress with TLS
   - templates/hpa.yaml — HPA for workers based on queue depth
   - templates/configmap.yaml — non-secret config (MCP URLs, model config)
   - templates/secret.yaml — secrets (API keys, DB password) — reference Vault
   - templates/cronjob.yaml — scheduled health checks (Phase 6, placeholder)

6. Create .github/workflows/ci-cloud.yml:
   name: CI Cloud Pipeline
   on:
     push: { paths: ['adapter-cloud/**', 'core/**'] }
     pull_request: { paths: ['adapter-cloud/**', 'core/**'] }

   Jobs:
   a. lint-and-typecheck:
      - Setup node 22, cd adapter-cloud, npm ci
      - npm run lint
      - npm run typecheck
   b. unit-tests:
      - npm run test -- --reporter=verbose
   c. docker:
      - Install hadolint, run on Dockerfile
      - docker build -t production-master:ci .
   d. helm:
      - Install helm
      - helm lint helm/
      - helm template production-master helm/ (dry-run)
   e. migrations:
      - Check migration files are sequentially numbered (001, 002, ...)
      - Check each is valid SQL (basic syntax check)
   f. security:
      - Install trivy
      - trivy image production-master:ci --severity HIGH,CRITICAL
   g. integration-tests:
      - docker-compose up -d postgres redis
      - Run migrations
      - npm run test -- --config vitest.integration.config.ts

Branch: feat/cloud-helm-ci
Commit: "feat: add Helm charts and CI pipeline for cloud service"
```

</details>

`--> PR 4.8`

---

### PR 4.8 — Staging deployment + alpha test

```
Branch: feat/cloud-staging
```

- [ ] Deploy to staging K8s namespace
- [ ] Run `POST /api/v1/investigate` against a real Jira ticket
- [ ] Verify all 12 agents execute successfully
- [ ] Verify all 9 MCP servers accessible via service account
- [ ] Verify PostgreSQL state tracks all phases correctly
- [ ] Verify reports stored in object storage
- [ ] Compare output quality against Claude Code plugin output

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 4.8 for the production-master cloud pipeline. This is a deployment + manual validation PR.

TASKS:

1. Create adapter-cloud/scripts/deploy-staging.sh:
   - Build Docker image: docker build -t production-master:staging .
   - Push to container registry
   - Run database migrations against staging DB
   - helm upgrade --install production-master helm/ -f helm/values-staging.yaml -n production-master-staging
   - Wait for rollout: kubectl rollout status deployment/production-master-api -n production-master-staging
   - Print endpoint URL

2. Create adapter-cloud/scripts/smoke-test.sh:
   - curl POST /health → expect 200
   - curl POST /ready → expect 200
   - curl POST /api/v1/investigate with body {"ticket_id": "SCHED-XXXXX"} → expect 202
   - Poll GET /api/v1/investigations/:id every 30s until status != "running" (timeout 20 min)
   - Print final status and verdict
   - curl GET /api/v1/investigations/:id/report → save to /tmp/staging-report.md

3. Document in PR description — manual testing checklist:
   - [ ] Staging deployment succeeded
   - [ ] Health endpoints respond
   - [ ] Investigation completes for real Jira ticket
   - [ ] All 12 agents executed (check agent_runs table)
   - [ ] All 9 MCP servers responded (check logs)
   - [ ] PostgreSQL has correct phase transitions
   - [ ] Report stored in S3
   - [ ] Report quality comparable to Claude Code output

Branch: feat/cloud-staging
Commit: "feat: add staging deployment scripts and smoke tests"
```

</details>

`[GATE] Phase 4 complete — Cloud MVP running in staging`

---

## Phase 5: Cloud Webhooks + Observability

> All Phase 5 PRs can run in parallel.

### PR 5.1 — Jira webhook adapter `||`

```
Branch: feat/cloud-jira-webhook
```

- [ ] Create `src/api/webhooks/jira.ts` — Jira webhook handler
- [ ] Auto-start investigation on ticket creation (configurable project filter)
- [ ] Deduplication: skip if same ticket investigated within 1h window
- [ ] Integration test with mock Jira webhook payload

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 5.1. Create a Jira webhook handler in adapter-cloud/src/api/webhooks/jira.ts.

- POST /api/v1/webhooks/jira — receives Jira webhook payload
- Filter: only trigger on issue_created events for configured project keys (env JIRA_PROJECT_FILTER, e.g. "SCHED,PAY,EVENTS")
- Extract ticket_id from payload (event.issue.key)
- Deduplication: query DB for investigations with same ticket_id in last 1 hour → skip if found
- Map Jira project key to domain config (query domain_configs table by jira_project field)
- If no domain config found, use default domain or skip with warning log
- Enqueue investigation job (same as POST /investigate)
- Return 200 immediately (webhook must respond fast)
- Validate Jira webhook signature if JIRA_WEBHOOK_SECRET is set
- Integration test: POST mock Jira webhook payload, verify investigation created

Branch: feat/cloud-jira-webhook
Commit: "feat: add Jira webhook adapter for auto-investigation"
```

</details>

### PR 5.2 — Slack command adapter `||`

```
Branch: feat/cloud-slack-command
```

- [ ] Create `src/api/webhooks/slack.ts` — Slack slash command handler
- [ ] Support `/investigate TICKET-ID` command
- [ ] Post investigation status updates back to Slack thread
- [ ] Integration test with mock Slack command payload

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 5.2. Create a Slack slash command handler in adapter-cloud/src/api/webhooks/slack.ts.

- POST /api/v1/webhooks/slack — receives Slack slash command payload
- Verify Slack signing secret (SLACK_SIGNING_SECRET env var)
- Parse command: /investigate TICKET-ID → extract ticket_id
- Respond immediately with 200 and ephemeral message: "Starting investigation for TICKET-ID..."
- Enqueue investigation job with trigger_source: "slack_command"
- Store Slack response_url and channel_id with the investigation
- When investigation completes (via callback or polling), POST summary to response_url
- Summary format: "*Investigation Complete*\n>Verdict: CONFIRMED (85%)\n>Root cause: ..."
- Integration test: POST mock Slack slash command payload, verify response

Branch: feat/cloud-slack-command
Commit: "feat: add Slack slash command adapter for /investigate"
```

</details>

### PR 5.3 — PagerDuty webhook adapter `||`

```
Branch: feat/cloud-pagerduty-webhook
```

- [ ] Create `src/api/webhooks/pagerduty.ts` — PagerDuty webhook handler
- [ ] Auto-investigate on P1/P2 incident creation
- [ ] Map PagerDuty service to domain config
- [ ] Integration test with mock PagerDuty payload

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 5.3. Create a PagerDuty webhook handler in adapter-cloud/src/api/webhooks/pagerduty.ts.

- POST /api/v1/webhooks/pagerduty — receives PagerDuty V3 webhook events
- Filter: only trigger on incident.triggered events with urgency "high" (P1/P2)
- Extract: service name, incident title, incident URL from payload
- Map PagerDuty service to domain config (match by service name or custom field)
- If a Jira ticket is linked in the incident, use that as ticket_id
- Otherwise, create a synthetic ticket_id: "PD-<incident_number>"
- Enqueue investigation with trigger_source: "pagerduty"
- Validate PagerDuty webhook signature (PAGERDUTY_WEBHOOK_SECRET)
- Integration test with mock PagerDuty incident.triggered payload

Branch: feat/cloud-pagerduty-webhook
Commit: "feat: add PagerDuty webhook adapter for P1/P2 auto-investigation"
```

</details>

### PR 5.4 — Grafana dashboards + alerting `||`

```
Branch: feat/cloud-dashboards
```

- [ ] Create Grafana dashboard JSON for Production Master operations
- [ ] Dashboard panels: investigation count, duration, verdict distribution, agent latency, MCP errors, token usage, queue depth
- [ ] Create Prometheus AlertManager rules (high error rate, long investigation, MCP down)

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 5.4. Create Grafana dashboards and Prometheus alert rules.

Create adapter-cloud/dashboards/production-master.json — Grafana dashboard JSON with panels:
- Row 1 (Overview): investigation count (pm_investigation_total), active investigations (gauge), verdict pie chart
- Row 2 (Performance): investigation duration histogram, agent duration by agent name, hypothesis iteration count
- Row 3 (MCP): MCP call latency by server, MCP error rate by server, MCP health status
- Row 4 (Cost): token usage by model, estimated LLM cost, queue depth gauge
- Row 5 (Workers): worker utilization, job processing rate

Create adapter-cloud/alerts/rules.yaml — Prometheus AlertManager rules:
- HighInvestigationFailureRate: pm_investigation_verdict{verdict="INCONCLUSIVE"} rate > 0.3 for 1h
- LongInvestigation: pm_investigation_duration_seconds > 1200 (20 min)
- MCPServerDown: pm_mcp_call_errors_total rate > 0.5 for 5m, per server
- HighTokenUsage: pm_llm_cost_dollars rate > 10/hour
- QueueBacklog: pm_queue_depth > 20 for 10m

Use the 12 metric names from src/observability/metrics.ts as data sources.

Branch: feat/cloud-dashboards
Commit: "feat: add Grafana dashboards and Prometheus alert rules"
```

</details>

`--> PR 5.5`

---

### PR 5.5 — Beta testing with 3+ domains

```
Branch: feat/cloud-beta
```

- [ ] Onboard 3 domain configs (Bookings + 2 others)
- [ ] Run beta for 2 weeks with real tickets
- [ ] Collect feedback and fix issues
- [ ] Tune confidence thresholds and iteration limits

<details>
<summary><strong>Agent Prompt</strong></summary>

```
PR 5.5 is a manual process PR, not a coding task. Document beta testing results in the PR description.

1. Insert Bookings domain config into the database (from Domain/Bookings/Server/scheduler/domain.json)
2. Onboard 2 additional domains (coordinate with team leads to create domain.json files)
3. Configure Jira webhooks for the 3 project keys
4. Run for 2 weeks, monitoring dashboards
5. Collect: investigation count, success rate, average duration, false positive rate
6. Fix any bugs found, tune hypothesis iteration limits and confidence thresholds
7. Document findings and adjustments in the PR description
```

</details>

`[GATE] Phase 5 complete — Cloud webhooks operational, observability live`

---

## Phase 6: Scale & Polish

### PR 6.1 — Auto-scaling + batch investigation `||`

```
Branch: feat/cloud-autoscaling
```

- [ ] Configure HPA (Horizontal Pod Autoscaler) based on queue depth
- [ ] Create `POST /api/v1/investigate/batch` endpoint
- [ ] Add callback webhooks — notify on investigation completion
- [ ] Load test: 10 concurrent investigations

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.1. Add auto-scaling and batch investigation support.

ALL PATHS ARE RELATIVE TO adapter-cloud/

1. Update helm/templates/hpa.yaml:
   - Scale workers based on custom metric pm_queue_depth (via Prometheus adapter)
   - Min replicas: 1, Max: 10, Target queue depth per worker: 3

2. Create src/api/routes/batch.ts:
   POST /api/v1/investigate/batch
   Body: { ticket_ids: string[], domain?: string, callback_url?: string }
   - Validate: max 20 tickets per batch
   - Create investigation records for each
   - Enqueue all to BullMQ
   - Return 202 { batch_id, investigation_ids: [...], status: "pending" }

3. Add callback webhook support to orchestrator/engine.ts:
   - When investigation completes, if callback_url is set:
   - POST to callback_url with { investigation_id, ticket_id, status, verdict, confidence, report_url }
   - Retry callback 3 times with exponential backoff

4. Create adapter-cloud/scripts/load-test.sh:
   - Submit 10 investigations concurrently using curl
   - Monitor queue depth and worker scaling
   - Report: total time, per-investigation time, any failures

Branch: feat/cloud-autoscaling
Commit: "feat: add auto-scaling, batch investigations, and callback webhooks"
```

</details>

### PR 6.2 — Vector DB for incident similarity `||`

```
Branch: feat/cloud-vector-db
```

- [ ] Evaluate and integrate vector DB (pgvector / Weaviate / Pinecone)
- [ ] Generate embeddings for completed investigations
- [ ] Add similarity search to hypothesis generation (find past similar incidents)
- [ ] Create `src/api/routes/similar.ts` — `GET /api/v1/investigations/:id/similar`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.2. Add vector similarity search for past incidents.

ALL PATHS ARE RELATIVE TO adapter-cloud/

Recommended approach: pgvector (simplest — uses existing PostgreSQL)

1. Enable pgvector extension: add to migrations/005_enable_pgvector.sql:
   CREATE EXTENSION IF NOT EXISTS vector;

2. The incident_embeddings table already exists (migration 004). Ensure it has:
   embedding vector(1536) — for text-embedding-3-small

3. Create src/workers/embedding-generator.ts:
   - After investigation completes, generate embedding from report summary
   - Use Anthropic's embedding API or OpenAI text-embedding-3-small
   - Store in incident_embeddings table with investigation_id and summary text

4. Create src/api/routes/similar.ts:
   GET /api/v1/investigations/:id/similar?limit=5
   - Fetch embedding for the given investigation
   - Query: SELECT * FROM incident_embeddings ORDER BY embedding <=> $1 LIMIT $2
   - Return: [{investigation_id, ticket_id, similarity_score, summary}]

5. Integrate with hypothesis generation:
   - Before generating hypotheses, search for similar past incidents
   - If similar incidents found, include their root causes as context for the hypotheses agent
   - Add to prompt: "Similar past incidents and their root causes: ..."

Branch: feat/cloud-vector-db
Commit: "feat: add vector similarity search for past incidents using pgvector"
```

</details>

### PR 6.3 — Scheduled health checks + CI/CD triggers `||`

```
Branch: feat/cloud-scheduled
```

- [ ] Create CronJob for hourly error rate monitoring
- [ ] Create `src/api/webhooks/grafana-alert.ts` — Grafana alert trigger
- [ ] Create CI/CD post-deploy health validation trigger
- [ ] Integration tests

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.3. Add scheduled health checks and automated triggers.

ALL PATHS ARE RELATIVE TO adapter-cloud/

1. Update helm/templates/cronjob.yaml:
   - Schedule: every hour ("0 * * * *")
   - Job: call POST /api/v1/health-check with list of monitored domains
   - The health check queries error rates for each domain's primary services
   - If error rate exceeds threshold (configurable, default 5x baseline), auto-trigger investigation

2. Create src/api/webhooks/grafana-alert.ts:
   POST /api/v1/webhooks/grafana-alert
   - Receives Grafana alerting webhook payload
   - Extract: alert name, service name, dashboard URL from labels
   - Map service to domain config
   - Auto-trigger investigation with trigger_source: "grafana_alert"
   - Deduplication: skip if same service investigated in last 2 hours

3. Create src/api/webhooks/cicd.ts:
   POST /api/v1/webhooks/deploy
   - Receives post-deploy webhook (from CI/CD pipeline)
   - Extract: service name, version, deployer from payload
   - Wait 5 minutes, then check error rates for the deployed service
   - If error rate increased, auto-trigger investigation with trigger_source: "post_deploy"

4. Integration tests for each webhook handler

Branch: feat/cloud-scheduled
Commit: "feat: add scheduled health checks and Grafana/CI-CD triggers"
```

</details>

### PR 6.4 — Multi-domain onboarding + GA readiness

```
Branch: feat/cloud-ga
```

- [ ] Onboard 20+ domain configs
- [ ] Create domain onboarding wizard API
- [ ] Performance benchmarks across domains
- [ ] Security audit
- [ ] Documentation for operators
- [ ] Release notes

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.4. Prepare the system for GA with onboarding tooling and documentation.

ALL PATHS ARE RELATIVE TO adapter-cloud/

1. Create src/api/routes/onboarding.ts:
   POST /api/v1/onboard
   Body: { github_repo: string, jira_project: string }
   - Auto-discover: clone repo, find service names from build configs
   - Auto-detect: language, build system, monorepo status
   - Generate draft domain.json config
   - Return draft for user review
   POST /api/v1/onboard/confirm
   - Save confirmed domain config to database

2. Create adapter-cloud/docs/operator-guide.md:
   - Deployment prerequisites (K8s, PostgreSQL, Redis, Vault)
   - Environment variables reference (all env vars used)
   - Helm values explained
   - Monitoring: where to find dashboards and alerts
   - Troubleshooting: common issues and resolutions
   - Scaling guidelines
   - Backup and recovery procedures

3. Create adapter-cloud/docs/onboarding-guide.md:
   - How to create a domain.json for your team
   - Required vs optional fields
   - How to configure Jira/Slack/PagerDuty webhooks for your project
   - Testing your config with a manual investigation

4. Performance benchmarks: create scripts/benchmark.sh
   - Run 5 investigations across different domains
   - Report: avg duration, token usage, cost per investigation

5. Update root README.md with GA release notes section

Branch: feat/cloud-ga
Commit: "feat: add onboarding wizard, operator docs, and GA preparation"
```

</details>

### PR 6.5 — User feedback loop `||`

```
Branch: feat/user-feedback-loop
Depends on: PR 6.4
```

- [ ] Implement structured feedback collection on investigation reports (ref: Doc 07 §1, feature C19)
- [ ] Add feedback-driven confidence recalibration (ref: Doc 07 §1, feature U18)
- [ ] Create feedback analytics pipeline and accuracy-over-time metrics (ref: Doc 07 §1, feature P29)
- [ ] Store per-domain accuracy baselines; surface trends in `/production-master-report`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.5. Add a user feedback loop so that investigation consumers can rate verdict accuracy and provide corrections.

Read design-docs/07-gaps-and-enhancements.md §1 for the full specification. Key features: C19 (structured feedback collection), U18 (confidence recalibration), P29 (accuracy metrics pipeline).

TASKS:

1. Create a feedback schema (adapter-cloud/src/models/feedback.ts):
   - investigation_id, rating (accurate | partially_accurate | inaccurate), corrected_root_cause (optional text), submitted_by, submitted_at
   - Store in PostgreSQL feedback table (add migration)

2. Create feedback API endpoints:
   POST /api/v1/investigations/:id/feedback — submit feedback
   GET  /api/v1/investigations/:id/feedback — retrieve feedback
   GET  /api/v1/analytics/accuracy          — accuracy-over-time report

3. Confidence recalibration:
   - Track historical accuracy per confidence bracket (e.g., 80-90% predictions that were accurate)
   - Expose calibration curve data via GET /api/v1/analytics/calibration
   - Use feedback to adjust future confidence scores (Bayesian update)

4. Surface accuracy trends in the report command output

Branch: feat/user-feedback-loop
Commit: "feat: add user feedback loop with accuracy tracking and confidence recalibration"
```

</details>

### PR 6.6 — Self-improvement meta-agent `||`

```
Branch: feat/self-improvement-meta-agent
Depends on: PR 6.5
```

- [ ] Build meta-agent that analyzes feedback patterns to suggest prompt/workflow improvements (ref: Doc 07 §2, feature P30)
- [ ] Create prompt effectiveness scoring based on aggregated feedback data
- [ ] Generate improvement recommendations as draft PRs or structured suggestions
- [ ] Add guardrails: human-in-the-loop approval for any prompt/workflow changes

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR 6.6. Build a self-improvement meta-agent that analyzes feedback data to recommend system improvements.

Read design-docs/07-gaps-and-enhancements.md §2 for the full specification. Key feature: P30 (self-improvement meta-agent).

TASKS:

1. Create core/agents/meta-improver.md:
   - Analyzes aggregated feedback from PR 6.5's feedback table
   - Identifies patterns: which agent prompts lead to inaccurate verdicts, which investigation phases are weakest
   - Generates structured improvement suggestions (prompt rewrites, workflow reordering, new hypothesis templates)

2. Create adapter-cloud/src/workers/meta-analysis.ts:
   - Scheduled job (weekly or on-demand via API)
   - Queries feedback data, groups by domain/agent/phase
   - Calls the meta-improver agent with aggregated data
   - Stores recommendations in a recommendations table

3. Create API endpoints:
   GET  /api/v1/meta/recommendations — list pending recommendations
   POST /api/v1/meta/recommendations/:id/approve — approve a recommendation
   POST /api/v1/meta/recommendations/:id/reject  — reject with reason

4. Guardrails:
   - No automatic changes to prompts or workflows
   - All recommendations require human approval
   - Track which recommendations were applied and their impact on accuracy

Branch: feat/self-improvement-meta-agent
Commit: "feat: add self-improvement meta-agent with human-in-the-loop approval"
```

</details>

`[GATE] Phase 6 complete — Production Master GA`

---

## Capability Abstraction PRs (from doc 05)

> These PRs interleave with Phases 1-4. They are independent of the surface adapters and can be worked on in parallel once Phase 1 is complete.

### PR CAP-1 — Capability registry + restructured skill files

```
Branch: feat/capability-registry
Depends on: PR 1.3 (skills in core/)
```

- [ ] Create `core/capabilities/registry.yaml` — capability-to-provider mapping
- [ ] Create `core/capabilities/interfaces/` — JSON Schema for each capability
  - [ ] `log-system.json`
  - [ ] `ticket-system.json`
  - [ ] `team-communications.json`
  - [ ] `code-search.json`
  - [ ] `version-control.json`
  - [ ] `feature-flags.json`
  - [ ] `domain-objects.json`
  - [ ] `documentation.json`
  - [ ] `service-registry.json`
- [ ] Add capability header (frontmatter) to all 9 skill files in `core/skills/`

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-1. Create the capability registry and interface schemas. Read design-docs/05-capability-abstraction-layer.md Sections 4 and 7 for the full specification.

TASKS:

1. Create core/capabilities/registry.yaml — copy the YAML from design doc Section 7 "Registry Design":
   9 capabilities, each with: description, provider (current), alternatives, required_operations
   Capabilities: ticket-system, log-system, code-search, team-communications,
     version-control, feature-flags, domain-objects, documentation, service-registry

2. Create core/capabilities/interfaces/ with 9 JSON Schema files.
   Each schema defines the input/output contract for that capability's operations.
   Use design doc Section 4 "Capability Interface Design" for the operation tables.

   Example — core/capabilities/interfaces/log-system.json:
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "title": "log-system capability interface",
     "description": "Production log and metric queries",
     "operations": {
       "query_logs": {
         "input": {
           "type": "object",
           "required": ["service", "time_range"],
           "properties": {
             "service": {"type": "string", "description": "Service name or artifact ID"},
             "level": {"type": "string", "enum": ["ERROR","WARN","INFO","DEBUG"]},
             "time_range": {"type": "object", "properties": {"from": {"type": "string"}, "to": {"type": "string"}}},
             "query": {"type": "string"},
             "limit": {"type": "number", "default": 100}
           }
         },
         "output": {
           "type": "array",
           "items": {"type": "object", "properties": {"timestamp": {}, "level": {}, "message": {}, "data": {}, "trace_id": {}}}
         }
       }
       // ... query_metrics, get_error_details, trace_request, list_services
     }
   }

   Create similar schemas for all 9 capabilities using the operation tables from the design doc.

3. Add capability frontmatter to each skill file in core/skills/:
   Prepend or update the YAML frontmatter block at the top of each SKILL.md:

   grafana-datasource/SKILL.md → add: capability: log-system, provider: grafana-datasource
   grafana-mcp/SKILL.md → add: capability: log-system, provider: grafana-mcp
   jira/SKILL.md → add: capability: ticket-system, provider: jira
   slack/SKILL.md → add: capability: team-communications, provider: slack
   github/SKILL.md → add: capability: version-control, provider: github
   octocode/SKILL.md → add: capability: code-search, provider: octocode
   ft-release/SKILL.md → add: capability: feature-flags, provider: ft-release
   fire-console/SKILL.md → add: capability: domain-objects, provider: fire-console
   context7/SKILL.md → add: capability: documentation, provider: context7

   If the file already has frontmatter (--- blocks), add the capability fields.
   If not, add a frontmatter block at the top.

Branch: feat/capability-registry
Commit: "feat: add capability registry and interface schemas"
```

</details>

`--> PR CAP-2`

---

### PR CAP-2 — First custom MCP: `log-system` (wraps Grafana)

```
Branch: feat/custom-mcp-log-system
Depends on: PR CAP-1
```

- [ ] Scaffold `custom-mcps/log-system/` — TypeScript MCP server project
- [ ] Implement `query_logs` tool — translates to Grafana ClickHouse SQL
- [ ] Implement `query_metrics` tool — translates to PromQL
- [ ] Implement `get_error_details` tool — aggregated error info
- [ ] Implement `trace_request` tool — cross-service tracing
- [ ] Implement `list_services` tool — monitored services list
- [ ] Create provider adapter for Grafana (`src/providers/grafana.ts`)
- [ ] Create response normalizer (`src/normalizers/log-normalizer.ts`)
- [ ] Create `package.json`, `tsconfig.json`
- [ ] Unit tests for each tool handler
- [ ] Integration test: query via custom MCP vs direct Grafana SQL, compare results

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-2. Build the first custom MCP server that abstracts Grafana into a generic log-system interface. Read design-docs/05-capability-abstraction-layer.md Section 6 for the full code examples and Section 11 for the architecture.

CONTEXT:
- This MCP server wraps the upstream grafana-datasource MCP (at mcp-s.wewix.net)
- Agents will call our abstract tools (query_logs, query_metrics) instead of raw SQL
- The server translates abstract requests into Grafana ClickHouse SQL, calls upstream, normalizes response
- Uses @modelcontextprotocol/sdk for MCP server implementation
- Read core/skills/grafana-datasource/SKILL.md for the upstream tool documentation and SQL patterns

TASKS:

1. Scaffold custom-mcps/log-system/:
   package.json (deps: @modelcontextprotocol/sdk, zod)
   tsconfig.json (strict, ES2022, NodeNext)
   src/index.ts, src/tools/, src/providers/, src/normalizers/, tests/

2. Create src/index.ts — MCP server entry point:
   Use the exact pattern from design doc Section 6 "Minimal Custom MCP Server":
   - McpServer({ name: "log-system", version: "1.0.0" })
   - Register all 5 tools
   - Connect via StdioServerTransport

3. Create src/tools/query-logs.ts:
   Abstract input: { service, level?, time_range: {from, to}, query?, limit? }
   Translation: build ClickHouse SQL:
     SELECT timestamp, artifact_id, error_class, message, data
     FROM app_logs
     WHERE $__timeFilter(timestamp) AND artifact_id = '{service}'
       AND level = '{level}' [AND message LIKE '%{query}%']
     ORDER BY timestamp DESC LIMIT {limit}
   Call upstream: grafana_datasource_query_sql with the SQL
   Normalize response to: [{timestamp, level, message, data, trace_id}]

4. Create src/tools/query-metrics.ts:
   Abstract input: { service, metric, time_range, aggregation? }
   Translation: build PromQL based on metric name:
     error_rate → rate(http_requests_total{service="{service}",status=~"5.."}[5m])
     latency_p99 → histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="{service}"}[5m]))
     request_count → sum(rate(http_requests_total{service="{service}"}[5m]))

5. Create src/tools/get-error-details.ts:
   Aggregation query — group errors by error_class with count and sample stack trace

6. Create src/tools/trace-request.ts:
   Query by request_id across app_logs and access_logs tables

7. Create src/tools/list-services.ts:
   Query distinct artifact_id values from app_logs

8. Create src/providers/grafana.ts:
   - Upstream MCP client connecting to grafana-datasource at mcp-s.wewix.net
   - Uses @modelcontextprotocol/sdk Client with HTTP transport
   - Method: querySql(sql, datasource) → calls grafana_datasource_query_sql

9. Create src/normalizers/log-normalizer.ts:
   - normalizeLogResults(raw): extract fields from Grafana response format
   - normalizeMetricResults(raw): format time-series data

10. Tests in tests/:
    - Unit test each tool with mock provider
    - Integration test: compare query_logs output vs direct SQL output

Branch: feat/custom-mcp-log-system
Commit: "feat: build log-system custom MCP server wrapping Grafana"
```

</details>

### PR CAP-3 — Mock MCP servers for testing `||`

```
Branch: feat/mock-mcps
Depends on: PR CAP-1
Can run in parallel with PR CAP-2
```

- [ ] Create `custom-mcps/mock-log-system/` — returns synthetic log data
- [ ] Create `custom-mcps/mock-ticket-system/` — returns synthetic tickets
- [ ] Create fixture data in each mock's `fixtures/` directory
- [ ] Each mock implements the same interface as the real MCP

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-3. Build mock MCP servers for testing without real data sources.

TASKS:

1. Create custom-mcps/mock-log-system/:
   - Same tool interface as custom-mcps/log-system/ (query_logs, query_metrics, etc.)
   - Instead of calling Grafana, return fixture data from fixtures/ directory
   - package.json, tsconfig.json, src/index.ts

   src/index.ts: McpServer({ name: "mock-log-system", version: "1.0.0" })
   Register same 5 tools, but handlers return JSON from fixture files

   Create fixtures/:
   - fixtures/query-logs-bookings-service.json — sample error logs for bookings-service
   - fixtures/query-metrics-error-rate.json — sample error rate time series
   - fixtures/error-details-bookings.json — aggregated errors
   Include realistic data: timestamps (recent), real-looking error classes, stack traces

2. Create custom-mcps/mock-ticket-system/:
   - Tools: get_ticket, search_tickets, add_comment, update_status
   - Return fixture data

   Create fixtures/:
   - fixtures/ticket-SCHED-12345.json — a realistic bug ticket with title, description, comments
   - fixtures/search-results.json — search results
   Include: realistic Jira-like ticket structure with severity, assignee, labels

3. Both mocks should:
   - Use McpServer from @modelcontextprotocol/sdk
   - Connect via StdioServerTransport
   - Be runnable with: npx tsx custom-mcps/mock-log-system/src/index.ts
   - Implement the EXACT same tool schemas as the real versions (from capability interfaces)

Branch: feat/mock-mcps
Commit: "feat: build mock MCP servers for testing"
```

</details>

`--> PR CAP-4`

---

### PR CAP-4 — Rename and refactor data collection agents

```
Branch: feat/task-driven-agents
Depends on: PR CAP-2
```

- [ ] Rename `grafana-analyzer.md` to `log-analyzer.md` — remove Grafana SQL from prompt
- [ ] Rename `slack-analyzer.md` to `team-comms-analyzer.md` — remove Slack data model
- [ ] Rename `artifact-resolver.md` to `service-resolver.md` — remove Grafana schema
- [ ] Rename `production-analyzer.md` to `change-tracker.md` — remove GitHub/FT-release specifics
- [ ] Update all orchestrator references to use new agent names
- [ ] Update skill file references in agent prompts (capability names, not vendor names)
- [ ] Validate: investigation with renamed agents produces same results

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-4. Rename data collection agents from vendor-named to task-named and remove vendor-specific logic from their prompts. Read design-docs/05-capability-abstraction-layer.md Section 8 for the before/after examples.

THIS IS A HIGH-RISK PR — agent prompts are the core of the system. Be precise.

TASKS — all in core/agents/:

1. Rename grafana-analyzer.md → log-analyzer.md:
   BEFORE: "Query Grafana AppAnalytics for error logs" + ClickHouse SQL templates
   AFTER: "Find error patterns in production logs for the services under investigation"
   - Remove ALL SQL templates, ClickHouse syntax, $__timeFilter references
   - Replace with capability language: "Use the log-system capability: query_logs, query_metrics, get_error_details"
   - Keep: objectives (find top errors, time boundaries, data payloads, metric anomalies)
   - Keep: output format, constraints, data isolation rules
   - Update name in frontmatter: name: log-analyzer

2. Rename slack-analyzer.md → team-comms-analyzer.md:
   - Remove Slack-specific: thread_ts, mrkdwn, channel IDs
   - Replace with: "Use the team-communications capability: search_messages, get_thread"
   - Update name: name: team-comms-analyzer

3. Rename artifact-resolver.md → service-resolver.md:
   - Remove Grafana artifact_id SQL lookups
   - Replace with: "Use the service-registry capability: resolve_service, list_services"
   - Update name: name: service-resolver

4. Rename production-analyzer.md → change-tracker.md:
   - Remove GitHub API field names and FT-release specific syntax
   - Replace with: "Use the version-control capability: list_commits, list_prs, get_diff"
   - And: "Use the feature-flags capability: get_flag, list_flags, get_rollout_history"
   - Update name: name: change-tracker

5. Update core/orchestrator/ references:
   - state-machine.md: update agent names in phase descriptions
   - agent-dispatch.md: update the agent list and skill mappings
   - hypothesis-loop.md: if it references specific agent names

6. Update adapter-claude/commands/production-master.md:
   - Update agent name references (grafana-analyzer → log-analyzer, etc.)

7. Update adapter-cursor/agents/ and adapter-cursor/commands/ if they exist

CRITICAL: The agent prompts must still work with the CURRENT MCP servers (grafana-datasource, slack, etc.)
until custom MCPs are built. The skill files still contain vendor-specific details — agents reference
capabilities abstractly but the skill files translate to vendor tools. This is the bridge period.

Branch: feat/task-driven-agents
Commit: "feat: rename agents to task-driven names, remove vendor coupling from prompts"
```

</details>

`--> PR CAP-5`

---

### PR CAP-5 — Remaining custom MCPs `||`

```
Branch: feat/custom-mcps-remaining
Depends on: PR CAP-4
```

- [ ] Build `custom-mcps/service-registry/` — wraps Grafana artifact lookup
- [ ] Build `custom-mcps/ticket-system/` — wraps Jira MCP (optional, lower priority)
- [ ] Build `custom-mcps/team-comms/` — wraps Slack MCP (optional, lower priority)

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-5. Build remaining custom MCP servers. Follow the same pattern as custom-mcps/log-system/ (PR CAP-2).

TASKS:

1. Build custom-mcps/service-registry/:
   Tools: resolve_service, list_services, get_service_metadata
   Wraps: grafana-datasource MCP (artifact_id lookups via SQL)
   - resolve_service: SELECT DISTINCT artifact_id FROM app_logs WHERE artifact_id LIKE '%{service_name}%'
   - list_services: SELECT DISTINCT artifact_id FROM app_logs WHERE artifact_id LIKE '{prefix}%'
   - get_service_metadata: query for service's error rate, last log timestamp, etc.

2. (OPTIONAL) Build custom-mcps/ticket-system/:
   Tools: get_ticket, search_tickets, add_comment, update_status
   Wraps: jira MCP
   - get_ticket → jira_get_issue
   - search_tickets → jira_search (JQL)
   - add_comment → jira_add_comment
   - Normalize Jira field names to abstract interface

3. (OPTIONAL) Build custom-mcps/team-comms/:
   Tools: search_messages, get_thread, post_message, find_channel
   Wraps: slack MCP
   - search_messages → slack_search_messages
   - get_thread → slack_get_thread
   - Normalize Slack data model (thread_ts, mrkdwn) to abstract format

Each server follows the same structure:
  package.json, tsconfig.json, src/index.ts, src/tools/, src/providers/, tests/

Priority: service-registry is P1 (needed for service-resolver agent), others are P2.

Branch: feat/custom-mcps-remaining
Commit: "feat: build service-registry custom MCP server"
```

</details>

### PR CAP-6 — Abstract publisher agent `||`

```
Branch: feat/abstract-publisher
Depends on: PR CAP-4
```

- [ ] Rename `publisher.md` to `report-publisher.md`
- [ ] Remove hardcoded Jira wiki markup and Slack mrkdwn from prompt
- [ ] Reference `ticket-system` and `team-communications` capabilities instead
- [ ] Move format-specific logic into skill files

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-6. Abstract the publisher agent from vendor-specific output formats. Read design-docs/05-capability-abstraction-layer.md Section 8 "Before vs After: report-publisher" for the exact transformation.

TASKS:

1. Rename core/agents/publisher.md → core/agents/report-publisher.md

2. Rewrite the agent prompt:
   BEFORE: hardcoded Jira wiki markup ({panel:title=...}, h2., {code}...) and Slack mrkdwn (*bold*, >quote, <url|text>)
   AFTER:
   ---
   name: report-publisher
   description: Publishes completed investigation reports to relevant channels and updates the bug ticket
   model: haiku
   tools: [Read, Write, ToolSearch]
   ---

   ## TASK
   Publish the investigation report to the team's communication channels and update the bug ticket with findings.

   ## Objectives
   1. Post the report to the ticket-system (add comment with findings)
   2. Post a summary to the team-communications channel
   3. Include links to evidence (log URLs, code URLs, etc.)

   ## Available Capabilities
   - `ticket-system`: Use add_comment to update the bug ticket
   - `team-communications`: Use post_message to notify the team

   ## Constraints
   - Use the output format appropriate for each channel (the skill file describes the format)
   - Include the investigation verdict, confidence score, and fix plan
   - Validate all links before posting (use the link validation hook)

3. Move vendor-specific format documentation into skill files:
   - Add Jira wiki markup syntax guide to core/skills/jira/SKILL.md (under a "Output Formatting" section)
   - Add Slack mrkdwn syntax guide to core/skills/slack/SKILL.md (under a "Output Formatting" section)
   These sections tell the agent HOW to format for each provider, but the agent prompt doesn't know WHICH provider it's using.

4. Update all references:
   - core/orchestrator/state-machine.md: Phase 9 → report-publisher (was publisher)
   - core/orchestrator/agent-dispatch.md: update agent list
   - adapter-claude/commands/production-master.md: update agent name
   - adapter-cursor/agents/: rename publisher.md → report-publisher.md
   - adapter-cursor/commands/: update references

Branch: feat/abstract-publisher
Commit: "feat: abstract publisher into report-publisher with capability-based output"
```

</details>

### PR CAP-7 — Known-issues registry + knowledge retrieval `||`

```
Branch: feat/known-issues-registry
Depends on: PR CAP-1
```

- [ ] Create structured knowledge files for known issues, past incidents, and domain-specific gotchas (ref: Doc 07 §3)
- [ ] Build knowledge retrieval capability — agents can query the known-issues registry during investigation
- [ ] Add `knowledge-base` capability interface to registry
- [ ] Seed with sample known-issues entries from existing domain configs

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-7. Add a known-issues registry and knowledge retrieval capability so agents can leverage institutional knowledge during investigations.

Read design-docs/07-gaps-and-enhancements.md §3 for the full specification.

TASKS:

1. Create core/capabilities/interfaces/knowledge-base.json:
   Operations: search_known_issues, get_issue_details, add_known_issue
   - search_known_issues: input {query, service?, tags?} → output [{id, title, symptoms, root_cause, fix}]
   - get_issue_details: input {id} → output {full known-issue record}
   - add_known_issue: input {title, symptoms, root_cause, fix, services, tags}

2. Create core/knowledge/ directory:
   - core/knowledge/known-issues/ — YAML files, one per known issue
   - core/knowledge/schema.yaml — defines the known-issue file format
   - Each file: title, symptoms (list), root_cause, fix, services (list), tags, added_date, last_seen

3. Add knowledge-base capability to core/capabilities/registry.yaml:
   knowledge-base:
     description: "Structured repository of known issues and institutional knowledge"
     provider: local-files
     alternatives: [vector-db, confluence]
     required_operations: [search_known_issues, get_issue_details, add_known_issue]

4. Integrate with hypothesis agent:
   - Before generating hypotheses, query known-issues registry for matching symptoms
   - If matches found, prioritize those as hypothesis candidates

5. Seed with 3-5 sample known-issue files based on common production patterns

Branch: feat/known-issues-registry
Commit: "feat: add known-issues registry and knowledge retrieval capability"
```

</details>

### PR CAP-8 — Cross-repo investigation support `||`

```
Branch: feat/cross-repo-investigation
Depends on: PR CAP-1
```

- [ ] Build service dependency graph capability — maps upstream/downstream service relationships (ref: Doc 07 §4)
- [ ] Add multi-repo traversal to the code-search capability — investigate across repo boundaries
- [ ] Extend domain config schema with `service_dependencies` and `related_repos` fields
- [ ] Update data-collection agents to follow dependency chains when initial investigation is inconclusive

<details>
<summary><strong>Agent Prompt</strong></summary>

```
You are implementing PR CAP-8. Add cross-repo investigation support so agents can trace issues across service boundaries.

Read design-docs/07-gaps-and-enhancements.md §4 for the full specification.

TASKS:

1. Extend domain config schema (core/domain/):
   Add fields:
   - service_dependencies: [{service: string, repo: string, relationship: "upstream"|"downstream"|"shared-lib"}]
   - related_repos: [{name: string, url: string, purpose: string}]

2. Create core/capabilities/interfaces/service-dependency-graph.json:
   Operations: get_dependencies, get_dependents, get_dependency_chain, resolve_cross_service_trace
   - get_dependencies: input {service} → output [{service, repo, relationship}]
   - get_dependents: input {service} → output [{service, repo, relationship}]
   - get_dependency_chain: input {service, depth?} → output [dependency tree]
   - resolve_cross_service_trace: input {trace_id} → output [{service, repo, span_data}]

3. Add service-dependency-graph capability to core/capabilities/registry.yaml

4. Update data-collection agent prompts:
   - When initial log analysis shows calls to upstream/downstream services, automatically expand investigation scope
   - Query the dependency graph to identify related services
   - Use multi-repo code-search to check recent changes in dependent services

5. Add cross-repo traversal to code-search capability interface:
   - search_across_repos: input {query, repos: string[]} → output [matches with repo context]

Branch: feat/cross-repo-investigation
Commit: "feat: add cross-repo investigation with service dependency graph"
```

</details>

`[GATE] Capability abstraction complete — all agents are task-driven, not tool-driven`

---

## Dependency Graph Summary

```
Phase 0 (design)
  │
  v
Phase 1 (core extraction)
  │
  ├──────────────────────┐
  v                      v
Phase 2 (Claude)     CAP-1 (registry)
  │                      │
  ├──────────┐           ├──────────┐
  v          v           v          v
Phase 3    Phase 4    CAP-2       CAP-3
(Cursor)   (Cloud)   (log MCP)  (mock MCPs)
  │          │           │
  v          v           v
Phase 3    Phase 5    CAP-4 (rename agents)
(cont.)    (webhooks)    │
  │          │           ├──────────┐
  v          v           v          v
  Done     Phase 6    CAP-5       CAP-6
           (scale)   (more MCPs) (publisher)
             │           │
             │         CAP-7 (known issues) || CAP-8 (cross-repo)
             │           │
             v           v
           PR 6.5      Done
          (feedback)
             │
             v
           PR 6.6
          (meta-agent)
             │
             v
            Done
```

---

## PR Size Guidelines

| PR | Estimated Size | Review Complexity |
|----|:--------------:|:-----------------:|
| 1.1 Scaffold core | S | Low |
| 1.2 Move agents | S | Low |
| 1.3 Move skills | S | Low |
| 1.4 Output + domain | M | Medium |
| 1.5 Extract orchestrator | L | High |
| 1.6 Core CI | M | Medium |
| 2.1 Claude scaffold | S | Low |
| 2.2 Refactor commands | L | High |
| 2.3 Claude hooks | M | Medium |
| 2.4 Claude CI | M | Medium |
| 2.5 Cleanup root | M | Medium |
| 3.1 Cursor scaffold | S | Low |
| 3.2 Cursor rules | M | Medium |
| 3.3 Cursor commands | L | High |
| 3.4 Cursor agents | M | Medium |
| 3.5 Cursor hooks | M | Medium |
| 3.6 Cursor CI | M | Medium |
| 3.7 Cursor E2E | M | High |
| 4.1 Cloud scaffold | S | Low |
| 4.2 Database | M | Medium |
| 4.3 MCP client | M | Medium |
| 4.4 Agent worker | L | High |
| 4.5 Observability | M | Medium |
| 4.6 API + orchestrator | XL | High |
| 4.7 Helm + CI | L | Medium |
| 4.8 Staging deploy | M | High |
| 5.1-5.4 Webhooks | S-M each | Medium |
| 5.5 Beta | M | High |
| 6.1-6.4 Scale | M-L each | Medium-High |
| CAP-1 Registry | M | Medium |
| CAP-2 Log system MCP | L | High |
| CAP-3 Mock MCPs | M | Low |
| CAP-4 Rename agents | L | High |
| CAP-5 Remaining MCPs | L | Medium |
| CAP-6 Publisher | M | Medium |
| CAP-7 Known-issues registry | M | Medium |
| CAP-8 Cross-repo investigation | L | High |
| 6.5 User feedback loop | L | High |
| 6.6 Self-improvement meta-agent | L | High |

---

## Maximum Parallelism Snapshot

At peak, the following workstreams can run simultaneously:

| Workstream | PRs | Team Member |
|------------|-----|-------------|
| Cursor adapter | PR 3.2 - 3.5 | Tamir |
| Cloud MVP | PR 4.2 - 4.5 | Tamir (or contributor) |
| Capability abstraction | PR CAP-2, CAP-3 | Tamir (or contributor) |

> **Note:** With a single engineer (Tamir), true parallelism is limited. The dependency graph is designed so that context-switching between workstreams is possible at natural boundaries (after each PR merge). With additional contributors, the Cloud and CAP tracks can be fully parallelized with the adapter work.

---

## References

| Document | Description |
|----------|-------------|
| [04-implementation-plan.md](./04-implementation-plan.md) | Phase-by-phase implementation plan |
| [05-capability-abstraction-layer.md](./05-capability-abstraction-layer.md) | CAP architecture and capability interfaces |
| [07-gaps-and-enhancements.md](./07-gaps-and-enhancements.md) | Gaps and enhancements identified in the strategic principles audit. Defines additional features including: user feedback loop (§1, C19/U18/P29), self-improvement meta-agent (§2, P30), known-issues registry (§3), and cross-repo investigation support (§4). PRs 6.5, 6.6, CAP-7, and CAP-8 in this document implement these features. |
