<p align="center">
  <img src="assets/banner.jpg" alt="Production Master" width="800">
</p>

# Production Master — Cursor Support

[![Version](https://img.shields.io/badge/version-1.0.3--beta-blue)](https://github.com/TamirCohen-Wix/production-master/releases/tag/v1.0.3-beta-cursor)
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
