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

Run `/update-context` from your repo in Claude Code. It analyzes your repo, asks a few questions, and generates a domain config (`domain.json`, `CLAUDE.md`, `MEMORY.md`). With a domain config, the pipeline works autonomously — without one, it asks for service names and artifact IDs during the investigation.

## Architecture

12 agents, 8 commands, 9 MCP skill references. The orchestrator classifies intent, gathers context from multiple sources in parallel, generates testable hypotheses, and iterates through a verification loop until a root cause is confirmed.

| Agent | Role |
|-------|------|
| `bug-context` | Parses Jira tickets into structured briefs |
| `artifact-resolver` | Validates service names against Grafana |
| `grafana-analyzer` | Queries production logs, reports raw findings |
| `codebase-semantics` | Maps code flows and error propagation |
| `production-analyzer` | Finds PRs, commits, feature toggle changes |
| `slack-analyzer` | Searches Slack for related discussions |
| `hypotheses` | Generates testable root cause theories |
| `verifier` | Quality gate — evaluates hypothesis proof |
| `skeptic` | Cross-examines competing hypotheses |
| `fix-list` | Creates actionable fix plans |
| `documenter` | Compiles investigation reports |
| `publisher` | Publishes findings to Jira and/or Slack |

For pipeline design, data flow, hypothesis loops, output format, and plugin internals, see the [architecture overview](docs/architecture.md).

## Documentation

| Topic | Description |
|-------|-------------|
| [Architecture](docs/architecture.md) | Pipeline design, agent table, data flow, output format |
| [Investigation flow](docs/investigation-flow.md) | Step-by-step state machine |
| [Commands reference](docs/commands.md) | All 8 commands with parameters and examples |
| [Agent catalog](docs/agents.md) | Agent profiles — inputs, outputs, skills |
| [Domain configs](docs/domain-configs.md) | Field reference, creation guide, config loading order |
| [Contributing](docs/contributing.md) | How to add domains, improve agents, submit PRs |
| [Troubleshooting](docs/troubleshooting.md) | MCP issues, mid-investigation recovery |

## Updating

To update to the latest version:

```bash
cd production-master
git pull --rebase origin main
bash scripts/install.sh          # Re-run installer to pick up new agents/skills/MCP
```

To install a specific version:

```bash
git checkout v1.0.2-beta         # Switch to a specific release tag
bash scripts/install.sh
```

To downgrade:

```bash
git checkout v1.0.1-beta         # Any previous tag
bash scripts/install.sh
```

> All available versions are listed on the [releases page](https://github.com/TamirCohen-Wix/production-master/releases).

## Feature Requests & Bug Reports

- **Request a feature:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=enhancement&template=feature_request.md) with the `enhancement` label
- **Report a bug:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=bug&template=bug_report.md) with the `bug` label
- **Ask a question:** [Start a discussion](https://github.com/TamirCohen-Wix/production-master/discussions)

## Contributing

```bash
gh repo fork TamirCohen-Wix/production-master --clone
cd production-master
claude --plugin-dir .   # Test changes per-session
```

PRs to `main` require passing CI and 1 approving review. See the [contributing guide](docs/contributing.md).

## Requirements

- [Cursor](https://cursor.com)
- [GitHub CLI](https://cli.github.com) (`gh`)
- [MCP access key](https://mcp-s-connect.wewix.net/mcp-servers) for Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
