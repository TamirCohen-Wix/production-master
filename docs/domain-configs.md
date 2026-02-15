# Domain Configs

Domain configs give Production Master the context it needs to investigate your repo — service names, artifact IDs, Slack channels, Jira project, feature toggle prefixes, and more. Without a domain config, the pipeline runs in "generic mode" and may need to ask you for this information mid-investigation.

## How It Works

The `Domain/` folder is a **shared knowledge base** organized by team and repo:

```
Domain/
└── {Division}/
    └── {Side}/
        └── {Repo}/
            ├── domain.json          ← Machine-readable config
            ├── CLAUDE.md            ← Human-readable repo context for agents
            └── memory/
                └── MEMORY.md        ← Patterns learned from past investigations
```

When you run `/production-master`, the orchestrator loads your domain config (Step 0.1.5) and uses it throughout the pipeline — agents know which artifact IDs to query in Grafana, which Slack channels to search, what Jira project to fetch from, and how to interpret request IDs.

## The Three Files

### `domain.json`

The core config file. Every field maps directly to a pipeline variable:

```json
{
  "company": "Wix",
  "division": "Bookings",
  "side": "Server",
  "repo": "scheduler",
  "github_org": "wix-private",
  "github_repo": "wix-private/scheduler",
  "jira_project": "SCHED",
  "artifact_prefix": "com.wixpress.bookings",
  "primary_services": [
    {"name": "bookings-service", "artifact_id": "com.wixpress.bookings.bookings-service"},
    {"name": "notifications-server", "artifact_id": "com.wixpress.bookings.notifications-server"}
  ],
  "slack_channels": {
    "alerts": "#bookings-alerts",
    "dev": "#bookings-dev",
    "incidents": "#bookings-incidents"
  },
  "request_id_format": "<unix_timestamp>.<random>",
  "toggle_prefix": "specs.bookings",
  "language": "scala",
  "build_system": "bazel",
  "monorepo": true,
  "grafana_url": "https://grafana.wixpress.com",
  "grafana_app_analytics_dashboard": "olcdJbinz"
}
```

| Field | Used By | Purpose |
|-------|---------|---------|
| `primary_services` | grafana-analyzer, artifact-resolver | Maps short names to full Grafana artifact IDs |
| `jira_project` | bug-context, publisher | Fetches and comments on tickets |
| `slack_channels` | slack-analyzer, publisher | Searches and posts to team channels |
| `artifact_prefix` | grafana-analyzer | Expands short service names (e.g., `bookings-service` → `com.wixpress.bookings.bookings-service`) |
| `toggle_prefix` | production-analyzer, fix-list | Searches feature toggles scoped to the team |
| `github_org` / `github_repo` | codebase-semantics, production-analyzer | Searches code and PRs |
| `request_id_format` | grafana-query | Extracts timestamps from request IDs for time-range queries |
| `subagent_model` | orchestrator | Model for all subagents — `"sonnet"` (default), `"opus"`, or `"haiku"` |

### `CLAUDE.md`

Human-readable context that gets loaded into agent prompts. Describes the repo's services, artifact ID patterns, key architectural patterns, and common investigation shortcuts. This is what helps agents understand your codebase without reading every file.

### `memory/MEMORY.md`

Accumulated knowledge from past investigations. Updated by `/update-context` after investigations complete. Contains:

- Pipeline-specific patterns (e.g., "bookings-reader errors appear inside bookings-service logs")
- Debugging shortcuts (e.g., "NULL meta_site_id means crash happened before MSID was set")
- Service interaction flows discovered during investigations
- Grafana query patterns that work well for this repo

## Creating a Domain Config

### Automatic (recommended)

Run `/update-context` from your repo in Claude Code:

```
/update-context
```

It will:
1. Detect your repo's language, build system, and structure
2. Ask interactive questions (Jira project, services, Slack channels, etc.)
3. Generate all three files to `~/.claude/production-master/domains/<repo>/`
4. Optionally open a PR to contribute them to the `Domain/` folder

### Manual

1. Create `Domain/<Division>/<Side>/<repo>/`
2. Copy the `domain.json` template above and fill in your values
3. Write a `CLAUDE.md` describing your services and patterns
4. Create `memory/MEMORY.md` with a skeleton:
   ```markdown
   # Memory

   ## Production Master Pipeline
   (Pipeline knowledge will be accumulated here from investigations)

   ## Codebase Patterns
   (Codebase-specific patterns will be documented here)
   ```
5. Open a PR

## Where Configs Are Loaded From

The orchestrator searches in this order (first match wins):

1. `~/.claude/production-master/domains/<repo>/domain.json` — primary (installed locally by `/update-context`)
2. `.claude/domain.json` — repo-local fallback (for repos that bundle their own config)
3. `~/.claude/domain.json` — legacy global fallback

The `Domain/` folder in this repo is the **canonical source** — when you PR a domain config here, other team members can install it to their local `~/.claude/production-master/domains/` path.

## Updating a Domain Config

Run `/update-context` again from a repo that already has a config. It will:

1. Scan recent investigation outputs (`debug-*` directories)
2. Extract new services, error patterns, Slack channels, and debugging shortcuts
3. Show a diff of proposed changes
4. Apply changes locally and optionally PR them back

This is how the domain configs improve over time — each investigation teaches the pipeline something new.
