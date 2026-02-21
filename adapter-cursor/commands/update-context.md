---
description: "Analyze investigations, create/update domain configs, and contribute improvements back via PR"
user-invocable: false
---

# Update Context — Domain Management & Continuous Improvement (Cursor Adapter)

You manage domain configurations and learn from past investigations. This command handles two scenarios:

1. **New repo with no domain config** — Build a `domain.json` and supporting files by analyzing the current repo and any past investigations
2. **Existing domain config** — Analyze recent investigations and suggest improvements, then PR them back

---

## Step 0: Detect Current State

### 0.1 Check for existing domain config

Detect repo name from `git remote get-url origin` (strip path and `.git`). Then check:
```
1. Read ~/.cursor/production-master/domains/<repo-name>/domain.json   (primary)
2. Read .cursor/domain.json                                           (repo-local fallback)
```
- If found in either location -> **EXISTING_DOMAIN mode** (skip to Step 3). Store the found path as `DOMAIN_PATH`.
- If NOT found -> **NEW_DOMAIN mode** (continue to Step 1)

### 0.2 Locate the production-master repo
Check in order:
1. `~/Projects/production-master/`
2. `~/.cursor/production-master/`
3. Ask user for path, or offer to clone: `git clone https://github.com/TamirCohen-Wix/production-master.git ~/Projects/production-master`

Store as `PM_ROOT`.

### 0.3 Check MCP Server Setup

Read the user's MCP configuration and compare with `$PM_ROOT/mcp-servers.json` (the template). List any missing servers and offer to configure them.

---

## Step 1: Build New Domain Config (NEW_DOMAIN mode)

### 1.1 Analyze current repo

Gather information from the current repo:

```bash
# Get repo name and org from git remote
git remote get-url origin

# Detect language
ls *.sbt build.sbt BUILD.bazel pom.xml package.json Cargo.toml go.mod pyproject.toml 2>/dev/null

# Detect monorepo structure
ls -d */ | head -20
```

### 1.2 Interactive domain building

Ask the user a series of questions to fill in the domain config:

1. **Company/Division/Side** — "What company and team does this repo belong to?"
2. **Jira project** — "What Jira project key do you use?" (e.g., SCHED, BOOK, PAY)
3. **Primary services** — "What are the main services/artifacts in this repo?"
   - If the user isn't sure, help by scanning the repo for artifact definitions
4. **Slack channels** — "What Slack channels does the team use for alerts, dev, and incidents?"
5. **Toggle prefix** — "What prefix do your feature toggles use?" (e.g., specs.bookings)

### 1.3 Generate the files

Create three files:

**`~/.cursor/production-master/domains/<repo-name>/domain.json`:**
```json
{
  "company": "<from user>",
  "division": "<from user>",
  "side": "<from user>",
  "repo": "<detected>",
  "github_org": "<detected>",
  "github_repo": "<detected>",
  "jira_project": "<from user>",
  "artifact_prefix": "<from user/detected>",
  "primary_services": ["<from user>"],
  "slack_channels": {"<from user>"},
  "request_id_format": "<from user or default>",
  "toggle_prefix": "<from user>",
  "language": "<detected>",
  "build_system": "<detected>",
  "monorepo": "<detected>"
}
```

**`~/.cursor/production-master/domains/<repo-name>/CURSOR.md`:**
Generate from the domain.json — list services with artifact IDs, describe the repo structure, note key patterns discovered during analysis.

**`~/.cursor/production-master/domains/<repo-name>/memory/MEMORY.md`:**
Start with a skeleton:
```markdown
# Memory

## Production Master Pipeline
(Pipeline knowledge will be accumulated here from investigations)

## Codebase Patterns
(Codebase-specific patterns will be documented here)
```

### 1.4 Install the files locally
Write all three files to `~/.cursor/production-master/domains/<repo-name>/`.

### 1.5 Offer to contribute back
Ask the user if they want to contribute the domain config to the production-master repo.

If yes -> **Go to Step 5 (PR flow)**

---

## Step 2: Find Recent Investigations (EXISTING_DOMAIN mode)

Search for debug directories:
```bash
find . .cursor ~/.cursor -maxdepth 4 -type d -name "debug-*" -mtime -30 2>/dev/null | sort -r | head -10
```

For each directory found, read:
- `findings-summary.md` — investigation state and key findings
- `report.md` — final investigation report (if exists)
- `*/*-output-V*.md` — phase outputs for detailed patterns

If no investigations found, tell the user: "No recent investigations found. Run `/production-master <ticket>` first, then use `/update-context` to learn from it."

---

## Step 3: Extract Patterns from Investigations

From the investigation reports, identify:

1. **New services** — artifact_ids that appeared but aren't in `domain.json -> primary_services`
2. **New error patterns** — recurring errors worth documenting in MEMORY.md
3. **New Slack channels** — channels referenced but not in `domain.json -> slack_channels`
4. **Updated artifact mappings** — corrections to artifact_id patterns
5. **Investigation shortcuts** — common queries, debugging patterns, or service interaction flows

---

## Step 4: Generate Diff

### 4.1 Compare with current domain config

Read domain.json from `DOMAIN_PATH` and compare findings.

### 4.2 Present changes

```
=== Update Context Summary ===

Investigations analyzed: [N]
Date range: [oldest] to [newest]

### domain.json changes
  [+] New service: <name> (<artifact_id>)
  [~] Updated channel: <old> -> <new>
  [+] New Slack channel: <name>

### MEMORY.md additions
  [+] Pattern: <description>
  [+] Shortcut: <description>

### CURSOR.md updates
  [~] Updated service list
  [+] New investigation pattern
```

### 4.3 Apply locally

Apply the changes to the domain files at `DOMAIN_PATH`.

---

## Step 5: Contribute Back via PR

If user wants to contribute:

### 5.1 Find production-master repo
Use `PM_ROOT` from Step 0.2.

### 5.2 Determine domain path
From `domain.json`, construct the path: `domain/{division}/{side}/{repo}/`

### 5.3 Create branch and apply changes

```bash
cd $PM_ROOT
git checkout main && git pull
git checkout -b update-context/$(date +%Y-%m-%d)-${REPO_NAME}
mkdir -p domain/{division}/{side}/{repo}/memory
# Copy files from cursor domains dir
```

### 5.4 Commit and push

```bash
git add domain/
git commit -m "update-context: {action} domain config for {repo}

{summary of changes}

Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin update-context/$(date +%Y-%m-%d)-${REPO_NAME}
```

### 5.5 Open PR

```bash
gh pr create \
  --title "Update domain: {repo}" \
  --body "## Summary
- {action}: domain config for {division}/{side}/{repo}
- Changes: {bullet list}

## Source
Generated by \`/update-context\` from investigation data.

---
Generated with [Production Master](https://github.com/TamirCohen-Wix/production-master)"
```

Report the PR URL to the user.

---

## Output

```
=== Update Context Complete ===

Action: [Created new domain / Updated existing domain]
Files modified: [list]
PR: [URL or "local only"]

Next: Run /production-master to investigate with your updated context.
```
