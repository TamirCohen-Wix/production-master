<p align="center">
  <img src="assets/banner.jpg" alt="Production Master" width="800">
</p>

# Production Master — Cursor Support

[![Claude Code Plugin](https://img.shields.io/badge/Cursor-Support-blue)](https://cursor.com)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)

Autonomous production investigation pipeline for [Cursor](https://cursor.com). This branch contains a `.cursor/` directory with agents, commands, and skills adapted for Cursor's single-agent model.

> [!TIP]
> **Using Claude Code?** See the [`main`](https://github.com/TamirCohen-Wix/production-master/tree/main) branch — it has the native Claude Code plugin with full multi-agent support.

> [!WARNING]
> **Partial support.** Cursor doesn't support the `Task` tool, so the orchestrator runs everything in a single agent context instead of launching parallel subagents. Investigations work but are slower than in Claude Code. The pipeline's multi-agent parallelism and agent teams features are not available in Cursor.

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
| Multi-agent parallelism | Yes — 4 agents run simultaneously | No — single agent, sequential |
| Agent teams | Yes — competing hypotheses in parallel | No — sequential hypothesis loop |
| Task tool | Supported | Not available |
| Models | Claude only (Haiku, Sonnet) | Mixed (GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet) |
| Commands | Native plugin commands | `.cursor/commands/` plain Markdown |
| MCP config | `~/.claude.json` | `~/.cursor/mcp.json` |

## This branch is auto-synced

The `cursor-support` branch is automatically synced from `main` via [GitHub Actions](https://github.com/TamirCohen-Wix/production-master/actions/workflows/sync-cursor.yml). Every push to `main` triggers a merge + `.cursor/` regeneration, including model patching from `cursor-models.json`. You don't need to manually keep this branch up to date.

## Requirements

- [Cursor](https://cursor.com)
- [GitHub CLI](https://cli.github.com) (`gh`)
- [MCP access key](https://mcp-s-connect.wewix.net/mcp-servers) for Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
