# Production Master

Autonomous production investigation pipeline for Claude Code. Classifies user intent, routes to specialized agents, and executes multi-step bug investigations with hypothesis loops.

## How It Works

Production Master installs **exclusively to `~/.claude/`** (user scope). It never touches your repo's `.claude/` directory — your repo's agents, settings, CLAUDE.md, and rules stay untouched.

```
~/.claude/                          ← User-scoped Claude Code config
├── agents/                         ← 12 pipeline agents (installed by production-master)
├── commands/                       ← 3 commands (production-master, update-context, git-update-agents)
├── skills/                         ← 9 MCP skill references
├── hooks/                          ← Link validation hook
├── output-styles/                  ← Investigation report + publisher formatting
└── production-master/              ← Production Master's own namespace
    ├── manifest.txt                ← Tracks all installed files (for clean uninstall)
    └── domains/                    ← Domain configs per repo
        └── scheduler/
            ├── domain.json         ← Artifact IDs, Jira project, Slack channels
            ├── CLAUDE.md           ← Repo-specific instructions (reference copy)
            └── memory/
                └── MEMORY.md       ← Accumulated investigation knowledge
```

**Your repo's `.claude/` is never modified.** Agents, commands, and skills work from `~/.claude/` because Claude Code checks both user and repo scope.

---

## Quick Start

### Install (from any directory)

```bash
curl -fsSL https://raw.githubusercontent.com/TamirCohen-Wix/production-master/main/Claude/install.sh | bash
```

### Install from cloned repo

```bash
git clone https://github.com/TamirCohen-Wix/production-master.git
cd production-master
./Claude/install.sh
```

### Also merge recommended settings (hooks, permissions)

```bash
./Claude/install.sh --with-settings
```

### Set up domain for your repo

After installing, run in Claude Code from your repo:
```
/update-context
```

This interactively builds `domain.json`, `CLAUDE.md`, and `MEMORY.md` for your repo, stored under `~/.claude/production-master/domains/<repo>/`, then offers to PR it back.

### Uninstall

```bash
./Claude/install.sh --uninstall
```

Reads the manifest and removes **only** files that production-master installed. Your `~/.claude/settings.json` is left as-is.

---

## Usage

After installation, use `/production-master` in Claude Code:

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/production-master show me error rate for bookings-service      # Query metrics
/production-master search slack for SCHED-45895                 # Search Slack
/production-master check toggle specs.bookings.SomeToggle       # Check toggles
```

Use `/update-context` after investigations to learn from them and contribute back.

---

## Architecture: 3 Layers

```
production-master/
├── Common/          ← Generic pipeline (agents, commands, skills, hooks, output-styles)
├── Domain/          ← Company/team/repo specific context
│   └── Bookings/Server/scheduler/
│       ├── domain.json, CLAUDE.md, memory/MEMORY.md
├── Claude/          ← Installation tooling
│   ├── install.sh
│   └── templates/settings.json
└── README.md
```

### Common — Generic Pipeline Components

12 specialized agents, 3 commands, 9 skill references, 2 output styles, 1 link validation hook.

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

Commands: `/production-master` (main orchestrator), `/update-context` (domain management & learning), `/git-update-agents` (sync back to repo).

### Domain — Company/Team/Repo Context

Each repository gets a domain directory containing:

- **`domain.json`** — Machine-readable config: artifact IDs, Jira project, GitHub org, Slack channels
- **`CLAUDE.md`** — Repo-specific Claude instructions: service descriptions, debugging tips
- **`memory/MEMORY.md`** — Accumulated investigation knowledge

You don't create these manually — use `/update-context` and it will guide you interactively.

---

## Investigation Flow

```mermaid
flowchart TD
    START["/production-master TICKET-ID"] --> CLASSIFY["Step 0: Classify Intent"]
    CLASSIFY --> |FULL_INVESTIGATION| INIT["Step 0.2: Create Output Dir"]
    CLASSIFY --> |QUERY_LOGS| DIRECT_GRAFANA["Direct Grafana Query"]
    CLASSIFY --> |TRACE_REQUEST| DIRECT_TRACE["Direct Request Trace"]
    CLASSIFY --> |Other modes| DIRECT_OTHER["Direct Execution"]

    INIT --> MCP_CHECK["Step 0.3: Verify 6 MCP Servers"]
    MCP_CHECK --> |All OK| JIRA["Step 0.4: Fetch Jira Ticket"]
    MCP_CHECK --> |Any FAIL| STOP["STOP — Fix MCP"]

    JIRA --> SKILLS["Step 0.5: Load Skill Files"]
    SKILLS --> BUG_CTX["Step 1: Bug Context"]
    BUG_CTX --> ENRICH["Step 1.3: Fire Console Enrichment"]
    ENRICH --> VALIDATE["Step 1.5: Validate Artifact IDs"]
    VALIDATE --> GRAFANA["Step 2: Grafana Analyzer"]
    GRAFANA --> LOCAL["Step 2.5: Find Local Code"]
    LOCAL --> CODEBASE["Step 3: Codebase Semantics"]

    CODEBASE --> PARALLEL["Step 4: Parallel Data Fetch"]

    subgraph PARALLEL_BOX ["Parallel Execution"]
        PROD["Production Analyzer"]
        SLACK["Slack Analyzer"]
        CODE_PRS["Codebase PRs"]
        FC["Fire Console Deep Enrichment"]
    end
    PARALLEL --> PROD & SLACK & CODE_PRS & FC

    PROD & SLACK & CODE_PRS & FC --> RECOVERY["Step 4.5: Recovery Window"]
    RECOVERY --> HYPOTHESIS["Step 5: Hypothesis Generation"]

    subgraph HYPO_BOX ["Hypothesis Phase"]
        direction TB
        HYPO_A["Tester A: Theory A"]
        HYPO_B["Tester B: Theory B"]
        SKEPTIC_V["Skeptic: Cross-examine"]
        HYPO_A & HYPO_B --> SKEPTIC_V
    end
    HYPOTHESIS --> HYPO_A & HYPO_B

    SKEPTIC_V --> DECISION{"Step 6: Verdict?"}
    DECISION --> |CONFIRMED| FIX["Step 7: Fix List"]
    DECISION --> |DECLINED| REGATHER["Re-gather Evidence"]
    REGATHER --> |"max 5 iterations"| HYPOTHESIS

    FIX --> DOC["Step 8: Documenter → report.md"]
    DOC --> PUB{"Step 9: Publish?"}
    PUB --> |Yes| PUBLISHER["Publisher → Jira/Slack"]
    PUB --> |No| DONE["COMPLETE"]
    PUBLISHER --> DONE
```

### Agent Data Flow

```mermaid
flowchart LR
    subgraph DATA_AGENTS ["Data Collection (isolated)"]
        GA[Grafana Analyzer]
        CS[Codebase Semantics]
        PA[Production Analyzer]
        SA[Slack Analyzer]
        FC[Fire Console]
    end

    BC[Bug Context] --> GA & CS
    GA --> CS
    BC & CS --> PA & SA & FC

    subgraph SYNTHESIS ["Synthesis (sees all reports)"]
        HY[Hypotheses]
        VE[Verifier / Skeptic]
    end

    GA & CS & PA & SA & FC --> HY
    HY --> VE

    VE --> |Confirmed| FL[Fix List]
    FL --> DC[Documenter]
    DC --> PB[Publisher]

    style DATA_AGENTS fill:#e8f4fd,stroke:#4a90d9
    style SYNTHESIS fill:#fdf2e8,stroke:#d9904a
```

**Key principle:** Data agents never see each other's outputs. Only Hypothesis and Verifier/Skeptic synthesize across all data sources, preventing confirmation bias.

---

## Output Directory Structure

Each investigation creates a timestamped output directory:

```
.claude/debug/debug-SCHED-45895-2026-02-14-143000/
├── findings-summary.md              ← Persistent state file (updated after every step)
├── report.md                        ← Final investigation report (Step 8)
│
├── bug-context/
│   ├── bug-context-output-V1.md
│   └── bug-context-trace-V1.md      ← Action log (human debugging only)
├── grafana-analyzer/
│   ├── grafana-analyzer-output-V1.md
│   └── grafana-analyzer-output-V2.md ← Re-run after Declined
├── codebase-semantics/
│   ├── codebase-semantics-output-V1.md
│   └── codebase-semantics-prs-output-V1.md
├── production-analyzer/
│   └── production-analyzer-output-V1.md
├── slack-analyzer/
│   └── slack-analyzer-output-V1.md
├── fire-console/
│   └── fire-console-output-V1.md
├── hypotheses/
│   ├── hypotheses-tester-A-output-V1.md
│   └── hypotheses-tester-B-output-V1.md
├── skeptic/
│   └── skeptic-output-V1.md
├── fix-list/
│   └── fix-list-output-V1.md
├── documenter/
│   └── documenter-output-V1.md
└── publisher/
    └── publisher-output-V1.md
```

**Naming:** `{agent}-output-V{N}.md` where N increments per re-invocation. Trace files (`-trace-`) are for human debugging only — never passed between agents.

**Location:** Inside a git repo: `.claude/debug/`. Outside: `./debug/`.

---

## Recommended Settings

The installer doesn't modify `~/.claude/settings.json` by default. To opt in:

```bash
./Claude/install.sh --with-settings
```

Or manually add these to `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"}]
    }],
    "PostToolUse": [{
      "matcher": "Write",
      "hooks": [{"type": "command", "command": "\"$HOME\"/.claude/hooks/validate-report-links.sh"}]
    }]
  }
}
```

- **Agent Teams** — Enables competing hypothesis testing with skeptic cross-examination
- **Notification hook** — Desktop notification when Claude needs your attention
- **Link validation hook** — Validates Grafana URLs and links in reports before publishing

---

## Contributing

### Contributing a new domain

The easiest way — use `/update-context`:

1. Install Production Master
2. Run `/update-context` — it guides you through creating domain config interactively
3. Say "yes" when it asks to open a PR
4. The PR lands in `Domain/<Division>/<Side>/<repo>/`

### Contributing pipeline improvements

1. **Fork & clone** this repo
2. **Edit files** in `Common/` (agents, commands, skills, hooks, output-styles)
3. **Test locally** — run `./Claude/install.sh` and use `/production-master` on a real ticket
4. **Open a PR** with what you changed and why

### Guidelines

- **Don't hardcode company-specific values** in `Common/` — use `domain.json` for anything repo-specific
- **Keep agents focused** — each agent has one job. Don't add analysis to data-collection agents
- **Test with real tickets** — the best way to validate changes
- **Update MEMORY.md** — if you learn something from an investigation, capture it

---

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- MCP servers: Grafana, Slack, Jira, GitHub, Octocode, FT-release (configured via your organization)
- `gh` CLI (for `/update-context` PR flow)
- `jq` (optional, for `--with-settings` merge)
