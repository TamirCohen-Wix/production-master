# Production Master

[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)](https://github.com/TamirCohen-Wix/production-master/releases)
[![Status](https://img.shields.io/badge/status-experimental-orange)](https://github.com/TamirCohen-Wix/production-master/releases)
[![CI](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml/badge.svg)](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet)](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)

Autonomous production investigation pipeline for Claude Code. Classifies user intent, routes to specialized agents, and executes multi-step bug investigations with hypothesis loops.

> [!WARNING]
> **This plugin is experimental.** The Claude Code plugin system is still evolving and breaking changes may occur. Install with `local` scope (the default) so the plugin only affects your current project and can be removed cleanly. **Do not install with `user` scope in production-critical environments.**

## Install

Clone the repo and run the installer:

```bash
gh repo clone TamirCohen-Wix/production-master
cd production-master
bash scripts/install.sh
```

Or [download the ZIP](https://github.com/TamirCohen-Wix/production-master/archive/refs/heads/main.zip), unzip, and run:

```bash
unzip production-master-main.zip
cd production-master-main
bash scripts/install.sh
```

The installer will:
1. Ask you to choose an install scope (defaults to **local** — see [Plugin Scopes](#plugin-scopes) below)
2. Register the **`production-master`** marketplace in Claude Code
3. Install the **`production-master`** plugin from that marketplace
4. Configure MCP servers — prompts for your [access key](https://mcp-s-connect.wewix.net/mcp-servers) (or reuses an existing one)
5. Enable agent teams in `~/.claude/settings.json`

> **Requires:** [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), [GitHub CLI](https://cli.github.com) (`gh`), and `jq` (auto-installed via Homebrew if missing)

## Plugin Scopes

When installing, you choose where the plugin is available:

| Scope | Location | Shared via git? | Available in | Best for |
|-------|----------|-----------------|--------------|----------|
| **`local`** (default) | `.claude/plugins/` in current project | No (gitignored) | Current project only | Personal use, experimenting |
| `project` | `.claude/plugins/` in current project | Yes | Current project only | Sharing with team via repo |
| `user` | `~/.claude/plugins/` | No | All projects | Power users who want it everywhere |

> [!WARNING]
> **Recommended: `local` scope.** Since this plugin is experimental, `local` scope keeps the blast radius small — it only affects the project where you installed it, and uninstalling is clean. Use `project` or `user` scope only if you understand the implications.

### Plugin management commands

```bash
# List installed plugins and their status
claude plugin list

# Install (after marketplace is registered)
claude plugin install production-master --scope local

# Uninstall
claude plugin uninstall production-master

# Remove the marketplace registration (optional)
claude plugin marketplace remove production-master

# Validate your installation
bash scripts/validate-install.sh
```

## Usage

After installing, restart Claude Code / Cursor, then use `/production-master`:

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/production-master show me error rate for bookings-service      # Query metrics
/production-master search slack for SCHED-45895                 # Search Slack
/production-master check toggle specs.bookings.SomeToggle       # Check toggles
```

### Other commands

| Command | Description |
|---------|-------------|
| `/production-master` | Full investigation pipeline |
| `/grafana-query` | Query Grafana logs & metrics directly |
| `/slack-search` | Search Slack discussions |
| `/production-changes` | Find PRs, commits, and feature toggle changes |
| `/resolve-artifact` | Validate and resolve service artifact IDs |
| `/fire-console` | Query domain objects via Fire Console gRPC |
| `/update-context` | Configure your domain (see below) |
| `/git-update-agents` | Sync agent updates back to the repo |

### Set up your repo

Run `/update-context` from within your repo in Claude Code. It:
- **New domain**: Analyzes your repo structure, asks interactive questions, and creates `domain.json`, `CLAUDE.md`, and `MEMORY.md` for your repo
- **Existing domain**: Learns from past investigations and updates the config with new services, error patterns, and channels
- Optionally opens a PR to contribute the config back to this repository

## Architecture

12 specialized agents, 8 commands, 9 MCP skill references.

| Agent | Role |
|-------|------|
| `bug-context` | Parses Jira tickets into structured briefs |
| `artifact-resolver` | Validates service names against Grafana |
| `grafana-analyzer` | Queries production logs, reports raw findings |
| `codebase-semantics` | Maps code flows, error propagation, service boundaries |
| `production-analyzer` | Finds PRs, commits, feature toggle changes |
| `slack-analyzer` | Searches Slack for related discussions |
| `hypotheses` | Generates testable root cause theories |
| `verifier` | Quality gate — evaluates hypothesis proof |
| `skeptic` | Cross-examines competing hypotheses (agent teams) |
| `fix-list` | Creates actionable fix plans with feature toggles |
| `documenter` | Compiles pipeline output into investigation reports |
| `publisher` | Publishes findings to Jira and/or Slack |

For investigation flow diagrams, data flow, and domain config details, see [docs/architecture.md](docs/architecture.md).

## Plugin Structure

```
production-master/
├── .claude-plugin/
│   ├── plugin.json              ← Plugin metadata
│   └── marketplace.json         ← Marketplace metadata
├── agents/                      ← 12 pipeline agents
├── commands/                    ← 8 commands
├── skills/                      ← 9 MCP skill references
├── hooks/
│   └── hooks.json               ← Notification + link validation hooks
├── scripts/
│   ├── install.sh               ← Installer
│   ├── validate-install.sh      ← Installation diagnostics
│   └── validate-report-links.sh ← Report link validator
├── output-styles/               ← Investigation report + publisher formatting
├── Domain/                      ← Domain configs (per-repo context for investigations)
├── mcp-servers.json             ← MCP server template (no secrets)
└── README.md
```

### Domain configs

The `Domain/` folder stores per-repo investigation context, organized as `Domain/{Division}/{Side}/{Repo}/`. Each domain contains:

- **`domain.json`** — Machine-readable config (services, artifact IDs, Jira project, Slack channels, toggle prefix)
- **`CLAUDE.md`** — Human-readable context for the investigation agents
- **`memory/MEMORY.md`** — Patterns learned from past investigations

These are created by `/update-context` and contributed back via PR.

## Contributing

### Set up your development environment

```bash
gh repo fork TamirCohen-Wix/production-master --clone
cd production-master
```

All PRs to `main` require:
- Passing CI checks (plugin validation, shell lint, structure tests)
- At least 1 approving review

### Add your repo's domain config

1. Install Production Master
2. Run `/update-context` from your repo — it guides you interactively
3. Say "yes" when it offers to open a PR
4. The PR adds config to `Domain/<Division>/<Side>/<repo>/`

### Improve the pipeline

1. Fork & clone this repo
2. Edit files directly (agents, commands, skills, hooks, output-styles)
3. Test locally — run `claude --plugin-dir .` and use `/production-master` on a real ticket
4. Open a PR

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- [GitHub CLI](https://cli.github.com) (`gh`)
- [MCP servers](https://mcp-s-connect.wewix.net/mcp-servers): Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console — see [`mcp-servers.json`](mcp-servers.json)

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
