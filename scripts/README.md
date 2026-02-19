# Scripts

Development and maintenance scripts for Production Master. Some are user-facing (install, validate), others are repo-owner-only (bump version, sync cursor, statusline).

## Who can do what

This repo uses **GitHub rulesets** to control what happens on `main`:

| Protection | What it enforces |
|------------|-----------------|
| **Pull request required** | All changes to `main` must go through a PR with 1 approving review |
| **Status checks required** | 4 CI checks must pass: plugin validation, content validation, shell lint, install test |
| **Squash merge only** | PRs are squash-merged to keep history clean |
| **No force push** | `main` cannot be force-pushed or rewritten |
| **No branch deletion** | `main` cannot be deleted |
| **Stale review dismissal** | Approvals are dismissed when new commits are pushed |
| **Thread resolution required** | All review threads must be resolved before merge |
| **Admin bypass** | Only the repo owner (admin role) can bypass these rules for direct pushes |

**In practice:**
- **Contributors** fork the repo, make changes, and open PRs. They cannot push to `main` directly, create tags, or create releases.
- **The repo owner** can bypass branch protection for direct pushes (used by `bump-version.sh` and `sync-cursor.sh`). Only the owner has admin access — the collaborator list is restricted to `TamirCohen-Wix`.
- **GitHub Actions** (`sync-cursor.yml`) uses `GITHUB_TOKEN` which has write access within the workflow but cannot bypass rulesets — if the sync-cursor workflow hits a merge conflict, it fails and requires manual resolution.
- **Tags and releases** can only be created by users with push access. Since `main` requires PRs and only the admin can bypass, effectively only the repo owner can tag releases via `bump-version.sh`.

## Scripts

### `install.sh` — Plugin installer (user-facing)

Installs Production Master as a Claude Code plugin. Registers the marketplace, installs the plugin, configures MCP servers, and enables agent teams.

```bash
cd production-master
bash scripts/install.sh
```

Prompts for install scope (`local`/`project`/`user`) and MCP access key. Safe to re-run — skips already-configured servers.

### `install-cursor.sh` — Cursor IDE installer (user-facing, cursor-support branch only)

Installs agents, commands, and skills into a Cursor config directory. Lives on the `cursor-support` branch.

```bash
git checkout cursor-support
bash scripts/install-cursor.sh              # Install to ~/.cursor (default)
bash scripts/install-cursor.sh .cursor      # Install to project-local .cursor/
```

Strips YAML frontmatter from commands (Cursor uses plain Markdown), adds a Cursor-specific header to `production-master.md`, ensures skill files have `name:` frontmatter, and configures MCP servers in Cursor's `mcp.json`. Tracks installed files in a manifest for clean reinstall.

### `validate-install.sh` — Installation diagnostics (user-facing)

Checks that the plugin is correctly installed and all components are present.

```bash
bash scripts/validate-install.sh
```

### `validate-report-links.sh` — Report link validator (hook, automatic)

Called automatically by the `PostToolUse` hook when a `*report.md` file is written. Checks for malformed Grafana URLs, bad GitHub PR links, invalid Slack archive links, and placeholder URLs. Not meant to be run manually.

### `bump-version.sh` — Version bump and release (repo owner only)

Reads the current version from `plugin.json`, bumps the patch number, updates all files, commits, tags, pushes, and creates a GitHub release.

```bash
bash scripts/bump-version.sh              # Dry run — shows what would change
bash scripts/bump-version.sh --execute    # Actually bump, commit, tag, push, release
```

**Dry run output:**
```
Version Bump Preview
  Current:  1.0.2-beta
  New:      1.0.3-beta
  Tag:      v1.0.3-beta

Files to update:
  .claude-plugin/plugin.json     — "version": "1.0.2-beta" → "1.0.3-beta"
  .claude-plugin/marketplace.json — "version": "1.0.2-beta" → "1.0.3-beta"
  README.md                       — 4 occurrences

Dry run — no changes made. Use --execute to apply.
```

**What `--execute` does:**
1. Reads current version from `.claude-plugin/plugin.json`
2. Bumps patch: `X.Y.Z-suffix` → `X.Y.(Z+1)-suffix`
3. Replaces old version in `plugin.json`, `marketplace.json`, `README.md`
4. Commits: `Bump version to X.Y.Z-beta`
5. Tags: `vX.Y.Z-beta`
6. Pushes commit + tag to `origin/main`
7. Creates GitHub release with auto-generated notes

**Why only the repo owner can run this:** The script pushes directly to `main` and creates tags. GitHub rulesets block direct pushes to `main` for everyone except admins. The script also requires a clean working tree and fails if there are uncommitted changes.

### `sync-cursor.sh` — Cursor branch auto-sync (repo owner only)

Merges `main` into the `cursor-support` branch and regenerates the `.cursor/` directory with Cursor-specific transforms.

```bash
bash scripts/sync-cursor.sh                   # Interactive: merge + regenerate + push
bash scripts/sync-cursor.sh --tag v1.0.3-beta # Also create a cursor-specific tag + release
bash scripts/sync-cursor.sh --ci              # Non-interactive: for GitHub Actions
```

**What it does:**
1. Ensures you're on `main`, pulls latest
2. Checks out `cursor-support` (creates from `main` if missing)
3. Merges `main` into `cursor-support` (uses `-X theirs` to auto-resolve conflicts in favor of main)
4. Regenerates `.cursor/` directory:
   - Commands: strips YAML frontmatter, prepends Cursor header to `production-master.md`
   - Agents: copied as-is
   - Skills: copied, `name:` added to frontmatter if missing
5. Commits and pushes `cursor-support`
6. If `--tag` provided: creates `vX.Y.Z-beta-cursor` tag and GitHub release
7. Switches back to `main`

**CI automation:** `.github/workflows/sync-cursor.yml` runs this script with `--ci` on every push to `main`, so `cursor-support` stays in sync automatically. If a merge conflict occurs, the CI job fails and requires manual resolution.

**Why only the repo owner can run this (locally):** Pushing to `cursor-support` requires write access to the repo. The CI workflow uses `GITHUB_TOKEN` for automated syncs.

### `statusline.sh` — Claude Code status bar (user-facing, optional)

Reads JSON from stdin (Claude Code status data) and outputs a formatted status line. If a Production Master investigation is running, shows the current pipeline phase.

```bash
# Configure in ~/.claude/settings.json:
# "statusline": { "command": "bash /path/to/production-master/scripts/statusline.sh" }
```

**Output formats:**
```
Phase 4/9: Parallel Data Fetch | Opus | ▓▓▓▓░░░░░░ 35% | $2.46   # During investigation
[grafana-analyzer] Opus | ▓▓▓░░░░░░░ 28% | $1.80                  # Agent running, no investigation
Opus | ▓▓▓▓▓▓▓░░░ 75% | $12.03                                    # Normal usage
```

The pipeline phase comes from `/tmp/.production-master-status`, written by the orchestrator at each state transition and cleaned up when the investigation completes.
