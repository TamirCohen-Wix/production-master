# Production Master

[![Version](https://img.shields.io/badge/version-1.0.0--beta-orange)](https://github.com/TamirCohen-Wix/production-master)
[![Status](https://img.shields.io/badge/status-experimental-red)](https://github.com/TamirCohen-Wix/production-master)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://github.com/TamirCohen-Wix)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-purple)](https://docs.anthropic.com/en/docs/claude-code)

> **Beta / Experimental** — This plugin is under active development. APIs, commands, and agent behavior may change between versions. Feedback and bug reports are welcome.

Autonomous production investigation pipeline for Claude Code. 12 agents, hypothesis loops with competing theories, 9 MCP integrations, and standalone tools for everyday production queries.

## Quick Start

### Install

```bash
claude plugin marketplace add TamirCohen-Wix/production-master && claude plugin install production-master
```

### Install from Zip (no Git required)

Download the [latest release](https://github.com/TamirCohen-Wix/production-master/releases/latest) zip, extract it, then:

```bash
claude plugin marketplace add /path/to/production-master && claude plugin install production-master
```

### Update

```bash
claude plugin update production-master
```

### Uninstall

```bash
claude plugin uninstall production-master
```

### Set Up Domain for Your Repo

After installing, run in Claude Code from your repo:
```
/update-context
```

This interactively builds `domain.json`, `CLAUDE.md`, and `MEMORY.md` for your repo, then offers to PR it back.

### Enable Agent Teams (Recommended)

Add this to your `~/.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

This enables competing hypothesis testing with skeptic cross-examination during investigations.

## Commands

| Command | Purpose |
|---------|---------|
| `/production-master` | Full investigation pipeline — Jira ticket, logs, trace, metrics, Slack, code, toggles |
| `/fire-console` | Query domain objects (bookings, services, events, sites) via gRPC |
| `/grafana-query` | Query logs, trace requests, check Prometheus metrics |
| `/slack-search` | Search Slack for production discussions and threads |
| `/production-changes` | Find recent PRs, commits, and feature toggle changes |
| `/resolve-artifact` | Validate service names against Grafana artifact IDs |
| `/update-context` | Create/update domain config and contribute back via PR |
| `/git-update-agents` | Sync local changes back to the production-master repo |

### Examples

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/grafana-query error rate for bookings-service                  # Prometheus metrics
/slack-search bookings outage last week                         # Search Slack
/production-changes merged PRs last 3 days                      # Recent changes
/fire-console get booking abc-123 msid:xyz                      # Domain object
/resolve-artifact bookings-service notifications-server         # Validate artifacts
```

## Features

- **12 specialized agents** with data isolation and quality gates
- **Hypothesis loops** with competing theories and skeptic cross-examination (agent teams)
- **9 MCP integrations** — Grafana, Slack, Jira, GitHub, Octocode, Feature Toggles, Fire Console, Context7, Grafana MCP
- **Domain-aware** — auto-loads repo config for artifact IDs, Slack channels, toggle prefixes
- **5 standalone tools** — use `/grafana-query`, `/slack-search`, etc. without running a full investigation
- **Self-validating** — quality gates on every agent, link validation hooks on reports
- **Parallel execution** — independent agents run simultaneously for faster investigations
- **Contribution workflow** — `/update-context` learns from investigations and PRs improvements back

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- MCP servers: Grafana Datasource, Grafana MCP, Slack, Jira, GitHub, Octocode, FT-release, Fire Console, Context7 (configured via your organization)

## Learn More

- [Architecture](docs/architecture.md) — Pipeline design, agent table, data flow, domain config
- [Agents](docs/agents.md) — All 12 agents: roles, inputs, outputs, quality gates
- [Commands](docs/commands.md) — Full command reference with all modes and examples
- [Investigation Flow](docs/investigation-flow.md) — State machine, mermaid diagrams, output directory structure
- [Contributing](docs/contributing.md) — Domain contribution, pipeline improvements, guidelines
- [Troubleshooting](docs/troubleshooting.md) — MCP issues, common problems, FAQ

---

**Author:** [Tamir Cohen](https://github.com/TamirCohen-Wix) | **Version:** 1.0.0-beta | **Status:** Experimental
