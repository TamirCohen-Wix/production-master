---
description: "Sync cursor-support branch from main — merge, regenerate .cursor/, generate README, push"
argument-hint: "[--tag vX.Y.Z]"
user-invocable: true
---

# Sync Cursor Support

You sync the `cursor-support` branch from `main`. This merges main, regenerates the `.cursor/` directory (agents, commands, skills with model patching), generates a Cursor-specific README, commits, and pushes.

---

## Argument Parsing

Parse `$ARGUMENTS` for flags:

| Flag | Example | Effect |
|------|---------|--------|
| `--tag` | `--tag v1.0.3-beta` | After push, create a cursor tag (`v1.0.3-beta-cursor`) and GitHub release |

---

## Step 1 — Preflight

1. Confirm you're on `main` with a clean working tree (`git status --porcelain` must be empty)
2. Pull latest: `git pull --rebase origin main`
3. Read `cursor-models.json` from repo root — you'll need it for model patching in Step 4

If not on main or tree is dirty, stop and tell the user.

---

## Step 2 — Switch to cursor-support and merge main

```bash
git checkout cursor-support
git merge main -X theirs -m "Sync cursor-support with main"
```

If cursor-support doesn't exist locally, track it from origin first:
```bash
git checkout -b cursor-support origin/cursor-support
```

The `-X theirs` flag auto-resolves conflicts in favor of main. Main is the source of truth — `.cursor/` is regenerated below anyway.

---

## Step 3 — Clean .cursor/ directory

Remove existing generated content:
```bash
rm -rf .cursor/agents .cursor/commands .cursor/skills
mkdir -p .cursor/agents .cursor/commands .cursor/skills
```

---

## Step 4 — Regenerate .cursor/agents

For each `.md` file in `core/agents/`:
1. Copy it to `.cursor/agents/`
2. Check `cursor-models.json` for a model override for this agent name
3. If found and the agent file has YAML frontmatter with a `model:` line, replace it with the Cursor model

Example: if `cursor-models.json` has `"grafana-analyzer": { "model": "gpt-4o" }` and the agent file has `model: sonnet`, change it to `model: gpt-4o`.

---

## Step 5 — Regenerate .cursor/commands

For each `.md` file in `adapter-claude/commands/`:
1. Strip YAML frontmatter (the `---` ... `---` block at the top) — Cursor commands use plain Markdown
2. Write the result to `.cursor/commands/<name>.md`

**Special case for `production-master.md`:** Prepend this header before the stripped content:

```
# Cursor: single agent — no Task tool. When this doc says "Launch Task with agent X", read .cursor/agents/X.md and execute those instructions yourself in this turn; write output to the path specified. Use .cursor/skills/<name>/SKILL.md for MCP tool names and parameters.

# Model note: This branch uses Cursor-optimized models (GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet) instead of Claude-only models. See cursor-models.json for the full mapping.

```

Also replace model references in the production-master command:
- `model: "haiku"` → `model: "gpt-4o-mini"`
- `model: "sonnet"` → `model: "gpt-4o"`
- `model="haiku"` → `model="gpt-4o-mini"`
- `model="sonnet"` → `model="gpt-4o"`

**Skip `sync-cursor.md`** — do not copy this command file to `.cursor/commands/`. It's a Claude Code command for syncing, not a Cursor command.

---

## Step 6 — Regenerate .cursor/skills

For each subdirectory in `core/skills/` that contains a `SKILL.md`:
1. Create `.cursor/skills/<name>/`
2. Copy `SKILL.md` into it
3. If the SKILL.md has YAML frontmatter but no `name:` field, add `name: <skill-name>` after the opening `---`

---

## Step 7 — Generate Cursor README

Read the version from `.claude-plugin/plugin.json` (the `version` field). Create a `__SHIELDS_VERSION__` by replacing `-` with `--` (shields.io escaping).

Write `README.md` at the repo root with this exact content (replace `__VERSION__` and `__SHIELDS_VERSION__` with the actual values):

```markdown
<p align="center">
  <img src="assets/banner.jpg" alt="Production Master" width="800">
</p>

# Production Master — Cursor Support

[![Version](https://img.shields.io/badge/version-__SHIELDS_VERSION__-blue)](https://github.com/TamirCohen-Wix/production-master/releases/tag/v__VERSION__-cursor)
[![CI](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml/badge.svg)](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml)
[![Cursor Support](https://img.shields.io/badge/Cursor-Support-blueviolet)](https://cursor.com)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)

Autonomous production investigation pipeline for [Cursor](https://cursor.com). This branch contains a `.cursor/` directory with agents, commands, and skills adapted for Cursor.

> [!TIP]
> **Using Claude Code?** See the [`main`](https://github.com/TamirCohen-Wix/production-master/tree/main) branch — it has the native Claude Code plugin with full multi-agent support.

> [!WARNING]
> **Partial support.** Cursor doesn't support agent teams (`TeamCreate` + `SendMessage`), so the orchestrator runs everything in a single agent context. Investigations work but lose the multi-agent parallelism and competing-hypothesis features available in Claude Code.

## Install

**Option A — Clone this branch:**

```bash
gh repo clone TamirCohen-Wix/production-master -- -b cursor-support
cd production-master
bash scripts/install-cursor.sh
```

**Option B — Download the ZIP:**

Download the [cursor-support ZIP](https://github.com/TamirCohen-Wix/production-master/archive/refs/heads/cursor-support.zip), unzip, and run:

```bash
cd production-master-cursor-support
bash scripts/install-cursor.sh
```

**Option C — Switch an existing clone:**

```bash
cd production-master
git checkout cursor-support
bash scripts/install-cursor.sh
```

### What the installer does

1. Copies agents to `~/.cursor/agents/` (or your custom target)
2. Copies commands to `~/.cursor/commands/` — strips YAML frontmatter (Cursor uses plain Markdown)
3. Copies skills to `~/.cursor/skills/`
4. Adds a Cursor-specific header to `production-master.md` that tells Cursor to inline agent instructions instead of launching subagents
5. Configures MCP servers in Cursor's `mcp.json` (prompts for your [access key](https://mcp-s-connect.wewix.net/mcp-servers))
6. Tracks installed files in a manifest for clean reinstall/uninstall

### Install to a custom directory

```bash
bash scripts/install-cursor.sh ~/.cursor           # User-global (default)
bash scripts/install-cursor.sh .cursor             # Project-local
bash scripts/install-cursor.sh /path/to/target     # Custom path
```

## Usage

After installing, restart Cursor (or reload window), then use the commands:

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/production-master search slack for SCHED-45895                 # Search Slack
/production-master check toggle specs.bookings.SomeToggle       # Check toggles
```

### Commands

| Command | Description |
|---------|-------------|
| `/production-master` | Full investigation pipeline |
| `/grafana-query` | Query Grafana logs & metrics |
| `/slack-search` | Search Slack discussions |
| `/production-changes` | Find PRs, commits, and feature toggle changes |
| `/resolve-artifact` | Validate and resolve service artifact IDs |
| `/fire-console` | Query domain objects via Fire Console gRPC |
| `/update-context` | Create or update your domain config |

Every command supports `--help` for usage and flag documentation.

## Model mapping

This branch uses Cursor-optimized models instead of Claude-only models. The mapping is defined in [`cursor-models.json`](cursor-models.json) and applied automatically during sync.

| Agent | Claude Code model | Cursor model | Why |
|-------|------------------|--------------|-----|
| `bug-context` | haiku | **gpt-4o-mini** | Simple Jira parsing |
| `artifact-resolver` | haiku | **gpt-4o-mini** | Validation queries |
| `documenter` | haiku | **gpt-4o-mini** | Template-based reports |
| `publisher` | haiku | **gpt-4o-mini** | Format conversion + posting |
| `slack-analyzer` | sonnet | **gpt-4o-mini** | Search + retrieve |
| `fix-list` | sonnet | **gpt-4o-mini** | Structured output |
| `grafana-analyzer` | sonnet | **gpt-4o** | SQL queries + log analysis |
| `production-analyzer` | sonnet | **gpt-4o** | PR/commit timeline reasoning |
| `hypotheses` | sonnet | **gpt-4o** | Causal reasoning |
| `verifier` | sonnet | **gpt-4o** | Critical evaluation |
| `skeptic` | sonnet | **gpt-4o** | Cross-examination |
| `codebase-semantics` | sonnet | **claude-3.5-sonnet** | Code understanding |

To change a model, edit `cursor-models.json` on `main` — the next sync will pick it up.

## How it differs from Claude Code

| Feature | Claude Code (`main`) | Cursor (`cursor-support`) |
|---------|---------------------|--------------------------|
| Subagents | `Task` tool — programmatic JSON API | Built-in — up to 8 parallel, git worktree isolation |
| Agent teams | `TeamCreate` + `SendMessage` | Not available |
| Commands | `.claude/commands/*.md` | `.cursor/commands/*.md` — same format |
| Rules | `CLAUDE.md` (hierarchical) | `.cursor/rules/*.mdc` (glob-scoped, 4 types) |
| Skills | `.claude/skills/` on-demand | `.cursor/skills/` — same pattern |
| Hooks | 5 events in `settings.json` | 6 events in `hooks.json` |
| MCP | No hard tool cap | 40-tool cap |
| Models | Claude only | Multi-model (GPT-4o, Claude, Gemini) |
| Browser | No | Built-in Chromium + DevTools |

## This branch is synced from main

The `cursor-support` branch is synced from `main` using the `/sync-cursor` command in Claude Code. Each sync merges main and regenerates `.cursor/`, including model patching from `cursor-models.json`.

To sync manually:
```
/sync-cursor
/sync-cursor --tag v1.0.3-beta
```

## Updating

To update to the latest version:

```bash
cd production-master
git pull --rebase origin cursor-support
bash scripts/install-cursor.sh
```

To install a specific version:

```bash
git checkout v1.0.3-beta-cursor    # Switch to a specific Cursor release tag
bash scripts/install-cursor.sh
```

To downgrade:

```bash
git checkout v1.0.1-beta-cursor    # Any previous Cursor tag
bash scripts/install-cursor.sh
```

> All versions are on the [releases page](https://github.com/TamirCohen-Wix/production-master/releases). Cursor releases have a `-cursor` suffix.

## Feature Requests & Bug Reports

- **Request a feature:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=enhancement&template=feature_request.md) with the `enhancement` label
- **Report a bug:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=bug&template=bug_report.md) with the `bug` label
- **Ask a question:** [Start a discussion](https://github.com/TamirCohen-Wix/production-master/discussions)

## Requirements

- [Cursor](https://cursor.com)
- [GitHub CLI](https://cli.github.com) (`gh`)
- [MCP access key](https://mcp-s-connect.wewix.net/mcp-servers) for Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
```

---

## Step 8 — Commit and push

```bash
git add .cursor/ README.md
git commit -m "Regenerate .cursor/ from main (sync)"
git push origin cursor-support
```

If there are no changes (`git diff --cached --quiet`), skip the commit and tell the user "already in sync".

---

## Step 9 — Tag and release (only if --tag was provided)

If `--tag` was passed (e.g., `--tag v1.0.3-beta`):

```bash
CURSOR_TAG="v1.0.3-beta-cursor"   # append -cursor suffix
git tag "$CURSOR_TAG"
git push origin "$CURSOR_TAG"
gh release create "$CURSOR_TAG" --title "$CURSOR_TAG" --generate-notes --prerelease --target cursor-support
```

---

## Step 10 — Switch back to main

```bash
git checkout main
```

Report a summary: how many commands, agents, and skills were generated.
