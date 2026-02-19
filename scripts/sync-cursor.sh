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
info "Merging main into cursor-support..."
if ! git merge main -m "Sync cursor-support with main (auto-generated)"; then
  err "Merge conflict detected. Resolve manually, then re-run."
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
      strip_frontmatter "$src"
    } > "$dest"
  else
    strip_frontmatter "$src" > "$dest"
  fi
  CMD_COUNT=$((CMD_COUNT + 1))
done
ok "Generated $CMD_COUNT commands"

# ─── Agents (copy as-is) ────────────────────────────────────────────
AGENT_COUNT=0
for src in "$AGENTS_SRC"/*.md; do
  [ -f "$src" ] || continue
  cp "$src" "$CURSOR_DIR/agents/$(basename "$src")"
  AGENT_COUNT=$((AGENT_COUNT + 1))
done
ok "Copied $AGENT_COUNT agents"

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

# ─── Commit ──────────────────────────────────────────────────────────
git add .cursor/
if git diff --cached --quiet; then
  ok "No changes to .cursor/ — already in sync"
else
  git commit -m "Sync cursor-support with main (auto-generated)"
  ok "Committed .cursor/ changes"
fi

# ─── Push ────────────────────────────────────────────────────────────
info "Pushing cursor-support..."
git push origin cursor-support
ok "Pushed cursor-support"

# ─── Tag + Release (optional) ────────────────────────────────────────
if [ -n "$TAG" ]; then
  CURSOR_TAG="${TAG}-cursor"
  info "Creating tag $CURSOR_TAG..."
  git tag "$CURSOR_TAG"
  git push origin "$CURSOR_TAG"
  if command -v gh &>/dev/null; then
    gh release create "$CURSOR_TAG" --title "$CURSOR_TAG" --generate-notes --target cursor-support
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
