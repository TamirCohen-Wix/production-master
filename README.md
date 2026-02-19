<p align="center">
  <img src="assets/banner.jpg" alt="Production Master" width="800">
</p>

# Production Master — Cursor Support

[![Version](https://img.shields.io/badge/version-1.0.3--beta-blue)](https://github.com/TamirCohen-Wix/production-master/releases/tag/v1.0.3-beta-cursor)
[![CI](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml/badge.svg)](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml)
[![Cursor Support](https://img.shields.io/badge/Cursor-Support-blueviolet)](https://cursor.com)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)

Autonomous production investigation pipeline for [Cursor](https://cursor.com). This branch contains a  directory with agents, commands, and skills adapted for Cursor's single-agent model.

> [!TIP]
> **Using Claude Code?** See the [](https://github.com/TamirCohen-Wix/production-master/tree/main) branch — it has the native Claude Code plugin with full multi-agent support.

> [!WARNING]
> **Partial support.** Cursor doesn't support the  tool, so the orchestrator runs everything in a single agent context instead of launching parallel subagents. Investigations work but are slower than in Claude Code. The pipeline's multi-agent parallelism and agent teams features are not available in Cursor.

## Install

**Option A — Clone this branch:**


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

**Option B — Download the ZIP:**

Download the [cursor-support ZIP](https://github.com/TamirCohen-Wix/production-master/archive/refs/heads/cursor-support.zip), unzip, and run:


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

**Option C — Switch an existing clone:**

Your branch is up to date with 'origin/cursor-support'.

[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

### What the installer does

1. Copies agents to  (or your custom target)
2. Copies commands to  — strips YAML frontmatter (Cursor uses plain Markdown)
3. Copies skills to 
4. Adds a Cursor-specific header to  that tells Cursor to inline agent instructions instead of launching subagents
5. Configures MCP servers in Cursor's  (prompts for your [access key](https://mcp-s-connect.wewix.net/mcp-servers))
6. Tracks installed files in a manifest for clean reinstall/uninstall

### Install to a custom directory


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor
[0;32m✓[0m jq available

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/agents/*.md (12 agents)
    /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/IdeaProjects/scheduler/production-master/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

## Usage

After installing, restart Cursor (or reload window), then use the commands:



### Commands

| Command | Description |
|---------|-------------|
|  | Full investigation pipeline |
|  | Query Grafana logs & metrics |
|  | Search Slack discussions |
|  | Find PRs, commits, and feature toggle changes |
|  | Validate and resolve service artifact IDs |
|  | Query domain objects via Fire Console gRPC |
|  | Create or update your domain config |

Every command supports  for usage and flag documentation.

## Model mapping

This branch uses Cursor-optimized models instead of Claude-only models. The mapping is defined in [](cursor-models.json) and applied automatically during sync.

| Agent | Claude Code model | Cursor model | Why |
|-------|------------------|--------------|-----|
|  | haiku | **gpt-4o-mini** | Simple Jira parsing |
|  | haiku | **gpt-4o-mini** | Validation queries |
|  | haiku | **gpt-4o-mini** | Template-based reports |
|  | haiku | **gpt-4o-mini** | Format conversion + posting |
|  | sonnet | **gpt-4o-mini** | Search + retrieve |
|  | sonnet | **gpt-4o-mini** | Structured output |
|  | sonnet | **gpt-4o** | SQL queries + log analysis |
|  | sonnet | **gpt-4o** | PR/commit timeline reasoning |
|  | sonnet | **gpt-4o** | Causal reasoning |
|  | sonnet | **gpt-4o** | Critical evaluation |
|  | sonnet | **gpt-4o** | Cross-examination |
|  | sonnet | **claude-3.5-sonnet** | Code understanding |

To change a model, edit  on  — the next sync will pick it up.

## How it differs from Claude Code

| Feature | Claude Code () | Cursor () |
|---------|---------------------|--------------------------|
| Multi-agent parallelism | Yes — 4 agents run simultaneously | No — single agent, sequential |
| Agent teams | Yes — competing hypotheses in parallel | No — sequential hypothesis loop |
| Task tool | Supported | Not available |
| Models | Claude only (Haiku, Sonnet) | Mixed (GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet) |
| Commands | Native plugin commands |  plain Markdown |
| MCP config |  |  |

## This branch is synced from main

The  branch is synced from  via [[0;31m✗[0m Must be on main branch (currently on: cursor-support)](scripts/sync-cursor.sh). Each sync merges main and regenerates , including model patching from . Syncs can be triggered manually via [GitHub Actions](https://github.com/TamirCohen-Wix/production-master/actions/workflows/sync-cursor.yml) or by running the script locally.

## Updating

To update to the latest version:

Already up to date.

[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

To install a specific version:


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

To downgrade:


[1mProduction Master — Cursor install[0m

[0;32m✓[0m Target directory: /Users/tamirc/.cursor
[0;32m✓[0m jq available

[1mCleaning previous installation[0m
[0;32m✓[0m Removed 30 files from previous install

[1mStep 1/4 — Cursor commands[0m
[0;32m✓[0m Installed command: /fire-console
[0;32m✓[0m Installed command: /git-update-agents
[0;32m✓[0m Installed command: /grafana-query
[0;32m✓[0m Installed command: /production-changes
[0;32m✓[0m Installed command: /production-master-debug
[0;32m✓[0m Installed command: /production-master
[0;32m✓[0m Installed command: /resolve-artifact
[0;32m✓[0m Installed command: /slack-search
[0;32m✓[0m Installed command: /update-context
[0;32m✓[0m Installed 9 slash commands in /Users/tamirc/.cursor/commands

[1mStep 2/4 — Cursor agents[0m
[0;32m✓[0m Installed agent: artifact-resolver
[0;32m✓[0m Installed agent: bug-context
[0;32m✓[0m Installed agent: codebase-semantics
[0;32m✓[0m Installed agent: documenter
[0;32m✓[0m Installed agent: fix-list
[0;32m✓[0m Installed agent: grafana-analyzer
[0;32m✓[0m Installed agent: hypotheses
[0;32m✓[0m Installed agent: production-analyzer
[0;32m✓[0m Installed agent: publisher
[0;32m✓[0m Installed agent: skeptic
[0;32m✓[0m Installed agent: slack-analyzer
[0;32m✓[0m Installed agent: verifier
[0;32m✓[0m Installed 12 agents in /Users/tamirc/.cursor/agents

[1mStep 3/4 — Cursor skills[0m
[0;32m✓[0m Installed skill: context7
[0;32m✓[0m Installed skill: fire-console
[0;32m✓[0m Installed skill: ft-release
[0;32m✓[0m Installed skill: github
[0;32m✓[0m Installed skill: grafana-datasource
[0;32m✓[0m Installed skill: grafana-mcp
[0;32m✓[0m Installed skill: jira
[0;32m✓[0m Installed skill: octocode
[0;32m✓[0m Installed skill: slack

[1mStep 4/4 — MCP servers[0m
[0;32m✓[0m All MCP servers already in Cursor config — skipping

[1mDone[0m

  [0;32mCursor setup complete.[0m

  Created:
    /Users/tamirc/.cursor/commands/*.md (9 slash commands)
    /Users/tamirc/.cursor/agents/*.md (12 agents)
    /Users/tamirc/.cursor/skills/<skill-name>/SKILL.md (9 skills)
  MCP config: /Users/tamirc/.cursor/mcp.json
  Manifest: /Users/tamirc/.cursor/.production-master-manifest

  Next: Restart Cursor (or reload window), then use:
    /production-master <TICKET-ID>
    /production-master-debug <what went wrong>
    /grafana-query, /slack-search, /fire-console, /update-context, etc.

> All versions are on the [releases page](https://github.com/TamirCohen-Wix/production-master/releases). Cursor releases have a  suffix.

## Feature Requests & Bug Reports

- **Request a feature:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=enhancement&template=feature_request.md) with the  label
- **Report a bug:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=bug&template=bug_report.md) with the  label
- **Ask a question:** [Start a discussion](https://github.com/TamirCohen-Wix/production-master/discussions)

## Requirements

- [Cursor](https://cursor.com)
- [GitHub CLI](https://cli.github.com) (Work seamlessly with GitHub from the command line.

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:          Authenticate gh and git with GitHub
  browse:        Open repositories, issues, pull requests, and more in the browser
  codespace:     Connect to and manage codespaces
  gist:          Manage gists
  issue:         Manage issues
  org:           Manage organizations
  pr:            Manage pull requests
  project:       Work with GitHub Projects.
  release:       Manage releases
  repo:          Manage repositories

GITHUB ACTIONS COMMANDS
  cache:         Manage GitHub Actions caches
  run:           View details about workflow runs
  workflow:      View details about GitHub Actions workflows

ALIAS COMMANDS
  co:            Alias for "pr checkout"

ADDITIONAL COMMANDS
  agent-task:    Work with agent tasks (preview)
  alias:         Create command shortcuts
  api:           Make an authenticated GitHub API request
  attestation:   Work with artifact attestations
  completion:    Generate shell completion scripts
  config:        Manage configuration for gh
  extension:     Manage gh extensions
  gpg-key:       Manage GPG keys
  label:         Manage labels
  preview:       Execute previews for gh features
  ruleset:       View info about repo rulesets
  search:        Search for repositories, issues, and pull requests
  secret:        Manage GitHub secrets
  ssh-key:       Manage SSH keys
  status:        Print information about relevant issues, pull requests, and notifications across repositories
  variable:      Manage GitHub Actions variables

HELP TOPICS
  accessibility: Learn about GitHub CLI's accessibility experiences
  actions:       Learn about working with GitHub Actions
  environment:   Environment variables that can be used with gh
  exit-codes:    Exit codes used by gh
  formatting:    Formatting options for JSON data exported from gh
  mintty:        Information about using gh with MinTTY
  reference:     A comprehensive reference of all gh commands

FLAGS
  --help      Show help for command
  --version   Show gh version

EXAMPLES
  $ gh issue create
  $ gh repo clone cli/cli
  $ gh pr checkout 321

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`
  Learn about accessibility experiences using `gh help accessibility`)
- [MCP access key](https://mcp-s-connect.wewix.net/mcp-servers) for Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
