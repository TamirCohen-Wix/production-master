# Production Master

Autonomous production investigation pipeline for Claude Code. Classifies user intent, routes to specialized agents, and executes multi-step bug investigations with hypothesis loops.

## Architecture: 3 Layers

```
production-master/
├── Common/          ← Generic pipeline (agents, skills, hooks, output-styles)
├── Domain/          ← Company/team/repo specific context
│   └── Bookings/
│       └── Server/
│           └── scheduler/
├── Claude/          ← Installation & integration tooling
│   ├── install.sh
│   ├── update-context.md
│   └── templates/
└── README.md
```

### Common — Generic Pipeline Components

12 specialized agents that form the investigation pipeline:

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
| `skeptic` | Cross-examines competing hypotheses |
| `fix-list` | Creates actionable fix plans with feature toggles |
| `documenter` | Compiles pipeline output into investigation reports |
| `publisher` | Publishes findings to Jira and/or Slack |

9 skill references for MCP tool documentation, 2 output styles, 1 link validation hook.

### Domain — Company/Team/Repo Context

Each supported repository gets a domain directory with:

- `domain.json` — Machine-readable config (artifact IDs, Jira project, GitHub org, Slack channels, etc.)
- `CLAUDE.md` — Repo-specific Claude instructions
- `memory/MEMORY.md` — Accumulated investigation knowledge

### Claude — Installation Tooling

- `install.sh` — One-liner installer that detects context and assembles config
- `templates/settings.json` — Base Claude Code settings template
- `update-context.md` — `/update-context` command for continuous improvement via PRs

## Quick Start

### One-liner install (from any repo)

```bash
curl -fsSL https://raw.githubusercontent.com/TamirCohen-Wix/production-master/main/Claude/install.sh | bash
```

### Install from cloned repo

```bash
git clone https://github.com/TamirCohen-Wix/production-master.git
cd production-master
./Claude/install.sh
```

### Force global install

```bash
./Claude/install.sh --force-global
```

## Usage

After installation, use the `/production-master` command in Claude Code:

```
/production-master SCHED-45895              # Full investigation from Jira ticket
/production-master get errors from bookings-service last 2h   # Query logs
/production-master trace 1769611570.535540810122211411840      # Trace request
/production-master show me error rate for bookings-service     # Query metrics
/production-master search slack for SCHED-45895               # Search Slack
/production-master check toggle specs.bookings.SomeToggle     # Check toggles
```

## Adding a New Domain

1. Create directory: `Domain/<Division>/<Side>/<repo>/`
2. Add `domain.json` with your config (see existing examples)
3. Add `CLAUDE.md` with repo-specific instructions
4. Add `memory/MEMORY.md` (can start empty)
5. Run `./Claude/install.sh` from your repo

## Updating

Use the `/update-context` command to:
- Analyze recent investigations for patterns
- Update domain.json with newly discovered services
- Update MEMORY.md with new investigation knowledge
- Open a PR to this repo with improvements

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- MCP servers configured (Grafana, Slack, Jira, GitHub, Octocode, FT-release)
- Access to your organization's production infrastructure
