
# Production Changes — Standalone Change Discovery Tool

You find recent PRs, commits, deployments, and feature toggle changes for a service or repo. No subagents — execute MCP calls inline.

---

## Step 0: Load Domain Config

Detect the current repo name from `git remote get-url origin` (strip path and `.git` suffix).

Search for domain config in this order:
1. `~/.claude/production-master/domains/<repo-name>/domain.json` (primary)
2. `.claude/domain.json` (repo-local fallback)
3. `~/.claude/domain.json` (legacy global fallback)

If found, extract:
```
GITHUB_ORG = domain.json → github_org
GITHUB_REPO = domain.json → github_repo
REPO_NAME = domain.json → repo
TOGGLE_PREFIX = domain.json → toggle_prefix
PRIMARY_SERVICES = domain.json → primary_services (array of {name, artifact_id})
```

If not found: log "No domain.json found. Provide the GitHub org/repo and toggle prefix manually."

---

## Step 1: Parse Arguments

Parse `$ARGUMENTS` to determine what changes to look for:

| Query Type | Trigger | Example |
|-----------|---------|---------|
| **RECENT_PRS** | "PRs"/"pull requests"/"merged" | `recent PRs for scheduler`, `merged PRs last 3 days` |
| **COMMITS** | "commits"/"changes" | `commits to bookings-service today` |
| **TOGGLE_CHANGES** | "toggle"/"feature flag" | `toggle changes for specs.bookings`, `recent toggles` |
| **ALL_CHANGES** | General / no specific type | `changes around 2026-02-10`, `what changed in the last day` |

Extract:
- **service/repo** — target service or repo
- **time_range** — date range to search (default: last 3 days)
- **toggle_name** — specific toggle to check (optional)

---

## Step 2: Load Skills

Read `skills/github/SKILL.md` and `skills/ft-release/SKILL.md` for tool parameters.

---

## Step 3: Execute

### Step 3a: GitHub Changes

Load GitHub tools:
```
ToolSearch("+github list_commits")
ToolSearch("+github list_pull_requests")
ToolSearch("+github search_issues")
```

**List recent PRs:**
```
list_pull_requests(
  owner: "<GITHUB_ORG>",
  repo: "<REPO_NAME>",
  state: "closed",
  sort: "updated",
  direction: "desc",
  perPage: 20
)
```

**List recent commits:**
```
list_commits(
  owner: "<GITHUB_ORG>",
  repo: "<REPO_NAME>",
  sha: "master",
  since: "<FROM_ISO>",
  perPage: 30
)
```

**Search PRs by keyword (if specific service mentioned):**
```
search_issues(
  query: "repo:<GITHUB_REPO> type:pr <service-name> merged:>YYYY-MM-DD",
  perPage: 15
)
```

### Step 3b: Feature Toggle Changes

Load FT tools:
```
ToolSearch("+gradual-feature-release search-feature-toggles")
ToolSearch("+gradual-feature-release get-feature-toggle")
ToolSearch("+gradual-feature-release list-releases")
```

**If specific toggle name provided:**
```
search-feature-toggles(searchText: "<toggle_name>")
→ get-feature-toggle(featureToggleId: "<id>")
→ list-releases(featureToggleId: "<id>")
```

**If toggle prefix from domain config:**
```
search-feature-toggles(searchText: "<TOGGLE_PREFIX>")
```
Then for each result modified in the time range, get details and release history.

---

## Step 4: Present Results

```
=== Production Changes: <repo/service> ===
Time Range: <from> to <to>

### Recent PRs (merged)
| PR | Title | Author | Merged | Files Changed |
|----|-------|--------|--------|---------------|
| #123 | Fix booking timeout | @user | 2026-02-13 | 5 |
| ... |

### Recent Commits
| SHA | Message | Author | Date |
|-----|---------|--------|------|
| abc1234 | SCHED-456: Fix null check | user | 2026-02-13 |
| ... |

### Feature Toggle Changes
| Toggle | Status | Strategy | Last Modified |
|--------|--------|----------|---------------|
| specs.bookings.NewFlow | Active | gradual (50%) | 2026-02-12 |
| ... |

### Toggle Release History (if specific toggle queried)
| Date | Action | From | To |
|------|--------|------|-----|
| 2026-02-12 | Rollout | 25% | 50% |
| ... |
```

**Rules:**
- Report raw data only — list changes without attributing causality.
- Always include PR numbers, commit SHAs, and toggle names for traceability.
- If a tool fails, report the error and continue with other data sources.
- Never fabricate PRs, commits, or toggle states.
