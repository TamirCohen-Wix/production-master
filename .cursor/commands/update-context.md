
# Update Context — Domain Management & Continuous Improvement

You manage domain configurations and learn from past investigations. This command handles two scenarios:

1. **New repo with no domain config** — Build a `domain.json`, `CLAUDE.md`, and `memory/MEMORY.md` by analyzing the current repo and any past investigations
2. **Existing domain config** — Analyze recent investigations and suggest improvements, then PR them back

---

## Step 0: Detect Current State

### 0.1 Check for existing domain config

Detect repo name from `git remote get-url origin` (strip path and `.git`). Then check:
```
1. Read ~/.claude/production-master/domains/<repo-name>/domain.json   (primary)
2. Read .claude/domain.json                                           (repo-local fallback)
```
- If found in either location → **EXISTING_DOMAIN mode** (skip to Step 3). Store the found path as `DOMAIN_PATH`.
- If NOT found → **NEW_DOMAIN mode** (continue to Step 1)

### 0.2 Locate the production-master repo
Check in order:
1. `~/Projects/production-master/`
2. `~/.claude/production-master/`
3. Ask user for path, or offer to clone: `git clone https://github.com/TamirCohen-Wix/production-master.git ~/Projects/production-master`

Store as `PM_ROOT`.

### 0.3 Check MCP Server Setup

Read the user's `~/.claude.json` and extract the top-level `mcpServers` keys. Then read `$PM_ROOT/mcp-servers.json` (the template). Compare:

For each server name in the template that is **not** present in the user's `mcpServers`:
- Add it to a `MISSING_SERVERS` list

**If no servers are missing:**
- Print: `All 9 MCP servers already configured.`
- Skip to Step 1 (or Step 2 for existing domains)

**If any servers are missing:**
1. List the missing servers: `Missing MCP servers: octocode, Slack, jira ...`
2. Ask the user: `Would you like to set up the [N] missing MCP servers?`
3. If yes:
   - Ask for their access key: `Enter your MCP access key (get one at https://mcp-s-connect.wewix.net/mcp-servers):`
   - Read the template from `$PM_ROOT/mcp-servers.json`
   - For each missing server: take the template entry, replace all `<YOUR_ACCESS_KEY>` occurrences with the user's real key
   - Read the current `~/.claude.json` as JSON
   - Merge the new server entries into `mcpServers` — **only add new entries, never override existing ones**
   - Write the updated `~/.claude.json` back
   - Print confirmation: `Added [N] MCP servers: octocode, Slack, ...`
   - Note: `fire-console` has no access key — it is added as-is from the template
4. If no: skip with `Skipping MCP setup. You can configure servers manually — see mcp-servers.json in the repo.`

---

## Step 1: Build New Domain Config (NEW_DOMAIN mode)

### 1.1 Analyze current repo

Gather information from the current repo:

```bash
# Get repo name and org from git remote
git remote get-url origin
# → extract GITHUB_ORG and REPO_NAME

# Detect language
ls *.sbt build.sbt BUILD.bazel pom.xml package.json Cargo.toml go.mod pyproject.toml 2>/dev/null

# Detect monorepo structure
ls -d */ | head -20
```

### 1.2 Interactive domain building

Ask the user a series of questions to fill in the domain config. Use the `AskUserQuestion` tool for each:

1. **Company/Division/Side** — "What company and team does this repo belong to?"
   - Example: Company=Wix, Division=Bookings, Side=Server
2. **Jira project** — "What Jira project key do you use?" (e.g., SCHED, BOOK, PAY)
3. **Primary services** — "What are the main services/artifacts in this repo? List names and artifact IDs."
   - If the user isn't sure, help by scanning the repo:
     ```bash
     # For Bazel repos
     grep -r "prime_app\|artifact_id" BUILD.bazel */BUILD.bazel 2>/dev/null | head -20
     # For Maven/SBT
     grep -r "artifactId\|name :=" build.sbt pom.xml */pom.xml 2>/dev/null | head -20
     ```
4. **Slack channels** — "What Slack channels does the team use for alerts, dev, and incidents?"
5. **Toggle prefix** — "What prefix do your feature toggles use?" (e.g., specs.bookings)

### 1.3 Generate the files

Create three files:

**`~/.claude/production-master/domains/<repo-name>/domain.json`:**
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
  "primary_services": [<from user>],
  "slack_channels": {<from user>},
  "request_id_format": "<from user or default>",
  "toggle_prefix": "<from user>",
  "language": "<detected>",
  "build_system": "<detected>",
  "monorepo": <detected>
}
```

**`~/.claude/production-master/domains/<repo-name>/CLAUDE.md`:**
Generate from the domain.json — list services with artifact IDs, describe the repo structure, note key patterns discovered during analysis.

**`~/.claude/production-master/domains/<repo-name>/memory/MEMORY.md`:**
Start with a skeleton:
```markdown
# Memory

## Production Master Pipeline
(Pipeline knowledge will be accumulated here from investigations)

## Codebase Patterns
(Codebase-specific patterns will be documented here)
```

### 1.4 Install the files locally
Write all three files to `~/.claude/production-master/domains/<repo-name>/`. The repo's `.claude/` directory is **never modified**.

### 1.5 Offer to contribute back
Ask the user:
```
Domain config created for <REPO_NAME>.
Would you like to contribute this to the production-master repo so others can use it?
```

If yes → **Go to Step 5 (PR flow)**

---

## Step 2: Find Recent Investigations (EXISTING_DOMAIN mode)

Search for debug directories:
```bash
find . .claude ~/.claude -maxdepth 4 -type d -name "debug-*" -mtime -30 2>/dev/null | sort -r | head -10
```

For each directory found, read:
- `findings-summary.md` — investigation state and key findings
- `report.md` — final investigation report (if exists)
- `*/  *-output-V*.md` — agent outputs for detailed patterns

If no investigations found, tell the user: "No recent investigations found. Run `/production-master <ticket>` first, then use `/update-context` to learn from it."

---

## Step 3: Extract Patterns from Investigations

From the investigation reports, identify:

1. **New services** — artifact_ids that appeared in investigations but aren't in `domain.json → primary_services`
2. **New error patterns** — recurring errors worth documenting in MEMORY.md
3. **New Slack channels** — channels referenced in investigations but not in `domain.json → slack_channels`
4. **Updated artifact mappings** — corrections to artifact_id patterns (e.g., bookings-reader is actually `com.wixpress.bookings.reader.bookings-reader`)
5. **Investigation shortcuts** — common queries, debugging patterns, or service interaction flows

---

## Step 4: Generate Diff

### 4.1 Compare with current domain config

Read domain.json from `DOMAIN_PATH` and compare:
- Are all discovered services listed in `primary_services`?
- Are Slack channels up to date?
- Is the artifact_prefix still accurate?
- Any new patterns for MEMORY.md?

### 4.2 Present changes

```
=== Update Context Summary ===

Investigations analyzed: [N]
Date range: [oldest] to [newest]

### domain.json changes
  [+] New service: <name> (<artifact_id>)
  [~] Updated channel: <old> → <new>
  [+] New Slack channel: <name>

### MEMORY.md additions
  [+] Pattern: <description>
  [+] Shortcut: <description>

### CLAUDE.md updates
  [~] Updated service list
  [+] New investigation pattern
```

### 4.3 Apply locally

Apply the changes to the domain files at `DOMAIN_PATH` (under `~/.claude/production-master/domains/<repo-name>/`).

---

## Step 5: Contribute Back via PR

Ask the user:
```
Would you like to open a PR to the production-master repo with these changes?
This helps the whole team benefit from what was learned.
```

If yes:

### 5.1 Find production-master repo
Use `PM_ROOT` from Step 0.2.

### 5.2 Determine domain path
From `domain.json`, construct the path:
```
Domain/{division}/{side}/{repo}/
```
Example: `Domain/Bookings/Server/scheduler/`

### 5.3 Create branch and apply changes

```bash
cd $PM_ROOT
git checkout main && git pull
git checkout -b update-context/$(date +%Y-%m-%d)-${REPO_NAME}

# Create or update domain directory
mkdir -p Domain/{division}/{side}/{repo}/memory

# Copy files from production-master domains dir
DOMAIN_SRC=~/.claude/production-master/domains/${REPO_NAME}
cp $DOMAIN_SRC/domain.json Domain/{division}/{side}/{repo}/domain.json
cp $DOMAIN_SRC/CLAUDE.md Domain/{division}/{side}/{repo}/CLAUDE.md
cp $DOMAIN_SRC/memory/MEMORY.md Domain/{division}/{side}/{repo}/memory/MEMORY.md
```

### 5.4 Commit and push

```bash
git add Domain/
git commit -m "update-context: {action} domain config for {repo}

{summary of changes}

Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin update-context/$(date +%Y-%m-%d)-${REPO_NAME}
```

### 5.5 Open PR

Use `gh pr create`:
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
