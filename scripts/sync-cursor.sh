#!/usr/bin/env bash
# Production Master — Cursor Support Sync
# Merges main into cursor-support and regenerates .cursor/ directory.
#
# Usage:
#   bash scripts/sync-cursor.sh              # Interactive: merge main → cursor-support, regenerate .cursor/
#   bash scripts/sync-cursor.sh --ci         # Non-interactive: for GitHub Actions (uses GITHUB_TOKEN)
#   bash scripts/sync-cursor.sh --tag v1.0.3-beta  # Also create a cursor-specific tag + release
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; exit 1; }

# ─── Parse arguments ─────────────────────────────────────────────────
CI_MODE=false
TAG=""
for arg in "$@"; do
  case "$arg" in
    --ci) CI_MODE=true ;;
    --tag) :;; # value is next arg, handled below
    --tag=*) TAG="${arg#--tag=}" ;;
    v*) TAG="$arg" ;; # positional: --tag v1.0.3-beta → TAG=v1.0.3-beta
    *) err "Unknown argument: $arg" ;;
  esac
done

cd "$REPO_ROOT"

# ─── Preflight ───────────────────────────────────────────────────────
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CI_MODE" = false ] && [ "$CURRENT_BRANCH" != "main" ]; then
  err "Must be on main branch (currently on: $CURRENT_BRANCH)"
fi

if [ "$CI_MODE" = false ]; then
  info "Pulling latest main..."
  git pull --rebase origin main
fi

# ─── Switch to cursor-support ────────────────────────────────────────
if git show-ref --verify --quiet refs/heads/cursor-support; then
  info "Switching to cursor-support..."
  git checkout cursor-support
elif git show-ref --verify --quiet refs/remotes/origin/cursor-support; then
  info "Tracking remote cursor-support..."
  git checkout -b cursor-support origin/cursor-support
else
  info "Creating cursor-support from main..."
  git checkout -b cursor-support main
fi

# ─── Merge main ──────────────────────────────────────────────────────
# Use -X theirs to auto-resolve conflicts in favor of main.
# Main is the source of truth — .cursor/ is regenerated below anyway,
# and non-.cursor files (README, scripts, etc.) should match main.
info "Merging main into cursor-support..."
if ! git merge main -X theirs -m "Sync cursor-support with main (auto-generated)"; then
  err "Merge failed even with -X theirs. Resolve manually, then re-run."
fi
ok "Merged main into cursor-support"

# ─── Regenerate .cursor/ directory ───────────────────────────────────
info "Regenerating .cursor/ directory..."

CURSOR_DIR="$REPO_ROOT/.cursor"
COMMANDS_SRC="$REPO_ROOT/commands"
AGENTS_SRC="$REPO_ROOT/agents"
SKILLS_SRC="$REPO_ROOT/skills"

# Clean existing .cursor/ content (agents, commands, skills only — preserve other files)
rm -rf "$CURSOR_DIR/agents" "$CURSOR_DIR/commands" "$CURSOR_DIR/skills"
mkdir -p "$CURSOR_DIR/agents" "$CURSOR_DIR/commands" "$CURSOR_DIR/skills"

# ─── Helper: strip YAML frontmatter ─────────────────────────────────
strip_frontmatter() {
  if head -1 "$1" | grep -q '^---$'; then
    local end_line
    end_line=$(awk 'NR>1 && /^---$/ { print NR; exit }' "$1")
    if [ -n "$end_line" ]; then
      tail -n "+$((end_line + 1))" "$1"
    else
      tail -n +2 "$1"
    fi
  else
    cat "$1"
  fi
}

# ─── Commands ────────────────────────────────────────────────────────
CMD_COUNT=0
for src in "$COMMANDS_SRC"/*.md; do
  [ -f "$src" ] || continue
  name=$(basename "$src" .md)
  dest="$CURSOR_DIR/commands/$name.md"
  if [ "$name" = "production-master" ]; then
    {
      echo "# Cursor: single agent — no Task tool. When this doc says \"Launch Task with agent X\", read $CURSOR_DIR/agents/X.md and execute those instructions yourself in this turn; write output to the path specified. Use $CURSOR_DIR/skills/<name>/SKILL.md for MCP tool names and parameters."
      echo ''
      echo "# Model note: This branch uses Cursor-optimized models (GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet) instead of Claude-only models. See cursor-models.json for the full mapping."
      echo ''
      strip_frontmatter "$src"
    } > "$dest"
    # Replace Claude model references with Cursor equivalents in the command file
    sed -e 's/model: "haiku"/model: "gpt-4o-mini"/g' \
        -e 's/model: "sonnet"/model: "gpt-4o"/g' \
        -e 's/model="haiku"/model="gpt-4o-mini"/g' \
        -e 's/model="sonnet"/model="gpt-4o"/g' \
        "$dest" > "$dest.tmp"
    mv "$dest.tmp" "$dest"
  else
    strip_frontmatter "$src" > "$dest"
  fi
  CMD_COUNT=$((CMD_COUNT + 1))
done
ok "Generated $CMD_COUNT commands"

# ─── Agents (copy + patch models from cursor-models.json) ───────────
CURSOR_MODELS="$REPO_ROOT/cursor-models.json"
AGENT_COUNT=0
for src in "$AGENTS_SRC"/*.md; do
  [ -f "$src" ] || continue
  name=$(basename "$src" .md)
  dest="$CURSOR_DIR/agents/$(basename "$src")"
  cp "$src" "$dest"

  # Patch model in frontmatter if cursor-models.json has an entry
  if [ -f "$CURSOR_MODELS" ]; then
    CURSOR_MODEL=$(jq -r --arg name "$name" '.agents[$name].model // empty' "$CURSOR_MODELS")
    if [ -n "$CURSOR_MODEL" ] && head -1 "$dest" | grep -q '^---$'; then
      if grep -q '^model:' "$dest"; then
        sed "s/^model:.*$/model: $CURSOR_MODEL/" "$dest" > "$dest.tmp"
        mv "$dest.tmp" "$dest"
      fi
    fi
  fi

  AGENT_COUNT=$((AGENT_COUNT + 1))
done
ok "Copied $AGENT_COUNT agents (models patched from cursor-models.json)"

# ─── Skills ──────────────────────────────────────────────────────────
SKILL_COUNT=0
for dir in "$SKILLS_SRC"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  [ -f "$dir/SKILL.md" ] || continue
  dest="$CURSOR_DIR/skills/$name"
  mkdir -p "$dest"
  cp "$dir/SKILL.md" "$dest/SKILL.md"
  # Ensure frontmatter has "name" for Cursor
  if ! grep -q '^name:' "$dest/SKILL.md" 2>/dev/null; then
    if head -1 "$dest/SKILL.md" | grep -q '^---'; then
      {
        head -1 "$dest/SKILL.md"
        echo "name: $name"
        tail -n +2 "$dest/SKILL.md"
      } > "$dest/SKILL.md.tmp"
      mv "$dest/SKILL.md.tmp" "$dest/SKILL.md"
    fi
  fi
  SKILL_COUNT=$((SKILL_COUNT + 1))
done
ok "Generated $SKILL_COUNT skills"

# ─── Generate Cursor-specific README ─────────────────────────────────
info "Generating Cursor README..."
# Read version from plugin.json for download links
VERSION=$(jq -r '.version' "$REPO_ROOT/.claude-plugin/plugin.json" 2>/dev/null || echo "1.0.0-beta")
SHIELDS_VERSION=$(echo "$VERSION" | sed 's/-/--/g')
cat > "$REPO_ROOT/README.md" << 'CURSOR_README_EOF'
<p align="center">
  <img src="assets/banner.jpg" alt="Production Master" width="800">
</p>

# Production Master — Cursor Support

[![Version](https://img.shields.io/badge/version-__SHIELDS_VERSION__-blue)](https://github.com/TamirCohen-Wix/production-master/releases/tag/v__VERSION__-cursor)
[![CI](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml/badge.svg)](https://github.com/TamirCohen-Wix/production-master/actions/workflows/ci.yml)
[![Cursor Support](https://img.shields.io/badge/Cursor-Support-blueviolet)](https://cursor.com)
[![Author](https://img.shields.io/badge/author-Tamir%20Cohen-green)](https://wix.slack.com/team/U09H3AHE3C7)

Autonomous production investigation pipeline for [Cursor](https://cursor.com). This branch contains a `.cursor/` directory with agents, commands, and skills adapted for Cursor's single-agent model.

> [!TIP]
> **Using Claude Code?** See the [`main`](https://github.com/TamirCohen-Wix/production-master/tree/main) branch — it has the native Claude Code plugin with full multi-agent support.

> [!WARNING]
> **Partial support.** Cursor doesn't support the `Task` tool, so the orchestrator runs everything in a single agent context instead of launching parallel subagents. Investigations work but are slower than in Claude Code. The pipeline's multi-agent parallelism and agent teams features are not available in Cursor.

## Install

**Option A — Clone this branch:**

```bash
gh repo clone TamirCohen-Wix/production-master -- -b cursor-support
cd production-master
bash scripts/install-cursor.sh
```

**Option B — Download the ZIP:**

Download the [cursor-support ZIP](https://github.com/TamirCohen-Wix/production-master/archive/refs/heads/cursor-support.zip), unzip, and run:

```bash
cd production-master-cursor-support
bash scripts/install-cursor.sh
```

**Option C — Switch an existing clone:**

```bash
cd production-master
git checkout cursor-support
bash scripts/install-cursor.sh
```

### What the installer does

1. Copies agents to `~/.cursor/agents/` (or your custom target)
2. Copies commands to `~/.cursor/commands/` — strips YAML frontmatter (Cursor uses plain Markdown)
3. Copies skills to `~/.cursor/skills/`
4. Adds a Cursor-specific header to `production-master.md` that tells Cursor to inline agent instructions instead of launching subagents
5. Configures MCP servers in Cursor's `mcp.json` (prompts for your [access key](https://mcp-s-connect.wewix.net/mcp-servers))
6. Tracks installed files in a manifest for clean reinstall/uninstall

### Install to a custom directory

```bash
bash scripts/install-cursor.sh ~/.cursor           # User-global (default)
bash scripts/install-cursor.sh .cursor             # Project-local
bash scripts/install-cursor.sh /path/to/target     # Custom path
```

## Usage

After installing, restart Cursor (or reload window), then use the commands:

```
/production-master SCHED-45895                                  # Full investigation
/production-master get errors from bookings-service last 2h     # Query logs
/production-master trace 1769611570.535540810122211411840        # Trace request
/production-master search slack for SCHED-45895                 # Search Slack
/production-master check toggle specs.bookings.SomeToggle       # Check toggles
```

### Commands

| Command | Description |
|---------|-------------|
| `/production-master` | Full investigation pipeline |
| `/grafana-query` | Query Grafana logs & metrics |
| `/slack-search` | Search Slack discussions |
| `/production-changes` | Find PRs, commits, and feature toggle changes |
| `/resolve-artifact` | Validate and resolve service artifact IDs |
| `/fire-console` | Query domain objects via Fire Console gRPC |
| `/update-context` | Create or update your domain config |

Every command supports `--help` for usage and flag documentation.

## Model mapping

This branch uses Cursor-optimized models instead of Claude-only models. The mapping is defined in [`cursor-models.json`](cursor-models.json) and applied automatically during sync.

| Agent | Claude Code model | Cursor model | Why |
|-------|------------------|--------------|-----|
| `bug-context` | haiku | **gpt-4o-mini** | Simple Jira parsing |
| `artifact-resolver` | haiku | **gpt-4o-mini** | Validation queries |
| `documenter` | haiku | **gpt-4o-mini** | Template-based reports |
| `publisher` | haiku | **gpt-4o-mini** | Format conversion + posting |
| `slack-analyzer` | sonnet | **gpt-4o-mini** | Search + retrieve |
| `fix-list` | sonnet | **gpt-4o-mini** | Structured output |
| `grafana-analyzer` | sonnet | **gpt-4o** | SQL queries + log analysis |
| `production-analyzer` | sonnet | **gpt-4o** | PR/commit timeline reasoning |
| `hypotheses` | sonnet | **gpt-4o** | Causal reasoning |
| `verifier` | sonnet | **gpt-4o** | Critical evaluation |
| `skeptic` | sonnet | **gpt-4o** | Cross-examination |
| `codebase-semantics` | sonnet | **claude-3.5-sonnet** | Code understanding |

To change a model, edit `cursor-models.json` on `main` — the next sync will pick it up.

## How it differs from Claude Code

| Feature | Claude Code (`main`) | Cursor (`cursor-support`) |
|---------|---------------------|--------------------------|
| Multi-agent parallelism | Yes — 4 agents run simultaneously | No — single agent, sequential |
| Agent teams | Yes — competing hypotheses in parallel | No — sequential hypothesis loop |
| Task tool | Supported | Not available |
| Models | Claude only (Haiku, Sonnet) | Mixed (GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet) |
| Commands | Native plugin commands | `.cursor/commands/` plain Markdown |
| MCP config | `~/.claude.json` | `~/.cursor/mcp.json` |

## This branch is synced from main

The `cursor-support` branch is synced from `main` via [`scripts/sync-cursor.sh`](scripts/sync-cursor.sh). Each sync merges main and regenerates `.cursor/`, including model patching from `cursor-models.json`. Syncs can be triggered manually via [GitHub Actions](https://github.com/TamirCohen-Wix/production-master/actions/workflows/sync-cursor.yml) or by running the script locally.

## Updating

To update to the latest version:

```bash
cd production-master
git pull --rebase origin cursor-support
bash scripts/install-cursor.sh
```

To install a specific version:

```bash
git checkout v1.0.2-beta-cursor    # Switch to a specific Cursor release tag
bash scripts/install-cursor.sh
```

To downgrade:

```bash
git checkout v1.0.1-beta-cursor    # Any previous Cursor tag
bash scripts/install-cursor.sh
```

> All versions are on the [releases page](https://github.com/TamirCohen-Wix/production-master/releases). Cursor releases have a `-cursor` suffix.

## Feature Requests & Bug Reports

- **Request a feature:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=enhancement&template=feature_request.md) with the `enhancement` label
- **Report a bug:** [Open an issue](https://github.com/TamirCohen-Wix/production-master/issues/new?labels=bug&template=bug_report.md) with the `bug` label
- **Ask a question:** [Start a discussion](https://github.com/TamirCohen-Wix/production-master/discussions)

## Requirements

- [Cursor](https://cursor.com)
- [GitHub CLI](https://cli.github.com) (`gh`)
- [MCP access key](https://mcp-s-connect.wewix.net/mcp-servers) for Grafana, Slack, Jira, GitHub, Octocode, FT-release, Context-7, Grafana-MCP, Fire Console

---

Made by [Tamir Cohen](https://wix.slack.com/team/U09H3AHE3C7)
CURSOR_README_EOF
# Inject dynamic version into the generated README
sed "s/__SHIELDS_VERSION__/${SHIELDS_VERSION}/g; s/__VERSION__/${VERSION}/g" "$REPO_ROOT/README.md" > "$REPO_ROOT/README.md.tmp"
mv "$REPO_ROOT/README.md.tmp" "$REPO_ROOT/README.md"
ok "Generated Cursor README"

# ─── Commit ──────────────────────────────────────────────────────────
git add .cursor/ README.md
if git diff --cached --quiet; then
  ok "No .cursor/ changes — already in sync"
else
  git commit -m "Regenerate .cursor/ from main (auto-sync)"
  ok "Committed .cursor/ changes"
fi

# ─── Push ────────────────────────────────────────────────────────────
info "Pushing cursor-support..."
# Pull remote changes first (CI may have already pushed a sync commit)
git pull --rebase origin cursor-support 2>/dev/null || true
git push origin cursor-support
ok "Pushed cursor-support"

# ─── Tag + Release (optional) ────────────────────────────────────────
if [ -n "$TAG" ]; then
  CURSOR_TAG="${TAG}-cursor"
  info "Creating tag $CURSOR_TAG..."
  git tag "$CURSOR_TAG"
  git push origin "$CURSOR_TAG"
  if command -v gh &>/dev/null; then
    gh release create "$CURSOR_TAG" --title "$CURSOR_TAG" --generate-notes --prerelease --target cursor-support
    ok "Created release $CURSOR_TAG"
  else
    warn "gh CLI not available — skipping GitHub release creation"
  fi
fi

# ─── Switch back to main ────────────────────────────────────────────
if [ "$CI_MODE" = false ]; then
  git checkout main
  ok "Back on main"
fi

echo ""
echo -e "${GREEN}${BOLD}Done!${NC} cursor-support is synced with main."
echo "  Commands: $CMD_COUNT | Agents: $AGENT_COUNT | Skills: $SKILL_COUNT"
