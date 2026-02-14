# Production Master

[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)](https://github.com/TamirCohen-Wix/production-master/releases)
[![Status](https://img.shields.io/badge/status-experimental-orange)](https://github.com/TamirCohen-Wix/production-master/releases)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-blueviolet)](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)

Autonomous production investigation pipeline for Claude Code. Classifies user intent, routes to specialized agents, and executes multi-step bug investigations with hypothesis loops.

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

The installer does the following:
1. Registers the **`production-master`** marketplace in Claude Code (this repo acts as both marketplace and plugin)
2. Installs the **`production-master`** plugin from that marketplace
3. Configures MCP servers — prompts for your [access key](https://mcp-s-connect.wewix.net/mcp-servers) and adds any missing servers to `~/.claude.json`
4. Enables agent teams in `~/.claude/settings.json`

> **Requires:** [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), [GitHub CLI](https://cli.github.com) (`gh`), and `jq` (auto-installed via Homebrew if missing)

## Uninstall

```bash
claude plugin uninstall production-master          # removes the plugin
claude plugin marketplace remove production-master # removes the marketplace (optional)
```

## Usage

After installing, use `/production-master` in Claude Code:

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/production-master show me error rate for bookings-service      # Query metrics
/production-master search slack for SCHED-45895                 # Search Slack
/production-master check toggle specs.bookings.SomeToggle       # Check toggles
```

### Set up your repo

Run `/update-context` from within your repo in Claude Code. It interactively creates `domain.json`, `CLAUDE.md`, and `MEMORY.md` for your repo and offers to PR the config back to this repository.

## Architecture

12 specialized agents, 3 commands, 9 MCP skill references.

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

Commands: `/production-master` (orchestrator), `/update-context` (domain config & learning), `/git-update-agents` (sync back to repo).

For investigation flow diagrams, data flow, and domain config details, see [docs/architecture.md](docs/architecture.md).

## Plugin Structure

```
production-master/
├── .claude-plugin/
│   ├── plugin.json              ← Plugin metadata
│   └── marketplace.json         ← Marketplace metadata
├── agents/                      ← 12 pipeline agents
├── commands/                    ← 3 commands
├── skills/                      ← 9 MCP skill references
├── hooks/
│   └── hooks.json               ← Notification + link validation hooks
├── scripts/
│   ├── install.sh               ← Installer
│   └── validate-report-links.sh ← Report link validator
├── output-styles/               ← Investigation report + publisher formatting
├── Domain/                      ← Company/team/repo domain configs
├── mcp-servers.json             ← MCP server template (no secrets)
└── README.md
```

## Contributing

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
