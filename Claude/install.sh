#!/usr/bin/env bash
set -euo pipefail

# Production Master Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/TamirCohen-Wix/production-master/main/Claude/install.sh | bash
#   ./install.sh                     (from repo root or any directory)
#   ./install.sh --force-global      (install to ~/.claude/)

REPO_URL="https://github.com/TamirCohen-Wix/production-master.git"
FORCE_GLOBAL=false
SCRIPT_DIR=""
PM_ROOT=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[production-master]${NC} $1"; }
warn() { echo -e "${YELLOW}[warning]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }
ask() { echo -e "${BLUE}[?]${NC} $1"; }

# Parse args
for arg in "$@"; do
  case "$arg" in
    --force-global) FORCE_GLOBAL=true ;;
    --help|-h)
      echo "Production Master Installer"
      echo ""
      echo "Usage:"
      echo "  ./install.sh                  Install to repo-local .claude/ or ~/.claude/"
      echo "  ./install.sh --force-global   Force install to ~/.claude/"
      echo ""
      echo "The installer will:"
      echo "  1. Detect your context (inside a repo? which repo?)"
      echo "  2. Find matching domain config if available"
      echo "  3. Copy pipeline components (agents, skills, hooks, output-styles)"
      echo "  4. Optionally configure MCP servers"
      exit 0
      ;;
  esac
done

# Step 1: Find production-master source
find_pm_root() {
  # Check if we're inside the production-master repo
  if [ -f "Common/agents/bug-context.md" ]; then
    PM_ROOT="$(pwd)"
    log "Running from production-master repo: $PM_ROOT"
    return 0
  fi

  # Check if script is being run from the repo
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
  if [ -f "$SCRIPT_DIR/../Common/agents/bug-context.md" ]; then
    PM_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    log "Found production-master at: $PM_ROOT"
    return 0
  fi

  # Clone to temp directory
  log "Cloning production-master to temporary directory..."
  PM_ROOT=$(mktemp -d)
  git clone --depth 1 "$REPO_URL" "$PM_ROOT" 2>/dev/null || error "Failed to clone production-master repo"
  log "Cloned to: $PM_ROOT"
  trap "rm -rf '$PM_ROOT'" EXIT
}

# Step 2: Determine install target
determine_target() {
  if $FORCE_GLOBAL; then
    TARGET="$HOME/.claude"
    warn "Force-global mode: installing to $TARGET"
    return 0
  fi

  # Check if we're in a git repo
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

  if [ -n "$REPO_ROOT" ] && [ "$REPO_ROOT" != "$PM_ROOT" ]; then
    TARGET="$REPO_ROOT/.claude"
    log "Detected repo: $REPO_ROOT"
    log "Installing to: $TARGET"
  else
    TARGET="$HOME/.claude"
    log "No repo detected. Installing globally to: $TARGET"
  fi
}

# Step 3: Detect domain
detect_domain() {
  DOMAIN_DIR=""

  if [ -z "$REPO_ROOT" ]; then
    return 0
  fi

  # Extract repo name from git remote
  REMOTE_URL=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")
  if [ -z "$REMOTE_URL" ]; then
    warn "No git remote found. Skipping domain detection."
    return 0
  fi

  # Extract repo name (handles both SSH and HTTPS URLs)
  REPO_NAME=$(echo "$REMOTE_URL" | sed -E 's#.*/([^/]+)(\.git)?$#\1#')
  log "Detected repo name: $REPO_NAME"

  # Search Domain/ for matching repo
  if [ -d "$PM_ROOT/Domain" ]; then
    FOUND=$(find "$PM_ROOT/Domain" -name "domain.json" -exec grep -l "\"repo\": \"$REPO_NAME\"" {} \; 2>/dev/null | head -1)
    if [ -n "$FOUND" ]; then
      DOMAIN_DIR="$(dirname "$FOUND")"
      log "Found domain config: $DOMAIN_DIR"
    else
      warn "No domain config found for repo '$REPO_NAME'."
      log "Installing in generic mode. Run '/update-context' in Claude Code to create a domain config for this repo."
    fi
  fi
}

# Step 4: Install Common layer
install_common() {
  log "Installing Common layer..."

  # Create target directories
  mkdir -p "$TARGET"/{agents,commands,skills,hooks,output-styles}

  # Copy agents
  if [ -d "$PM_ROOT/Common/agents" ]; then
    cp "$PM_ROOT/Common/agents/"*.md "$TARGET/agents/"
    log "  Agents: $(ls "$PM_ROOT/Common/agents/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy commands
  if [ -d "$PM_ROOT/Common/commands" ]; then
    cp "$PM_ROOT/Common/commands/"*.md "$TARGET/commands/"
    log "  Commands: $(ls "$PM_ROOT/Common/commands/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy skills (preserve directory structure)
  if [ -d "$PM_ROOT/Common/skills" ]; then
    for skill_dir in "$PM_ROOT/Common/skills"/*/; do
      skill_name=$(basename "$skill_dir")
      mkdir -p "$TARGET/skills/$skill_name"
      cp "$skill_dir"* "$TARGET/skills/$skill_name/" 2>/dev/null || true
    done
    log "  Skills: $(ls -d "$PM_ROOT/Common/skills"/*/ 2>/dev/null | wc -l | tr -d ' ') directories"
  fi

  # Copy hooks
  if [ -d "$PM_ROOT/Common/hooks" ]; then
    cp "$PM_ROOT/Common/hooks/"* "$TARGET/hooks/"
    chmod +x "$TARGET/hooks/"*.sh 2>/dev/null || true
    log "  Hooks: $(ls "$PM_ROOT/Common/hooks/"* 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy output styles
  if [ -d "$PM_ROOT/Common/output-styles" ]; then
    cp "$PM_ROOT/Common/output-styles/"*.md "$TARGET/output-styles/"
    log "  Output styles: $(ls "$PM_ROOT/Common/output-styles/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi
}

# Step 5: Install domain context
install_domain() {
  if [ -z "$DOMAIN_DIR" ]; then
    log "No domain context to install."
    return 0
  fi

  log "Installing domain context from: $(basename "$(dirname "$(dirname "$(dirname "$DOMAIN_DIR")")")")/.../$( basename "$DOMAIN_DIR")"

  # Copy domain.json
  if [ -f "$DOMAIN_DIR/domain.json" ]; then
    cp "$DOMAIN_DIR/domain.json" "$TARGET/domain.json"
    log "  domain.json installed"
  fi

  # Copy CLAUDE.md
  if [ -f "$DOMAIN_DIR/CLAUDE.md" ]; then
    cp "$DOMAIN_DIR/CLAUDE.md" "$TARGET/CLAUDE.md"
    log "  CLAUDE.md installed"
  fi

  # Copy memory
  if [ -d "$DOMAIN_DIR/memory" ]; then
    # For global install, put in projects memory
    # For repo-local, put in .claude/ directly
    if $FORCE_GLOBAL; then
      mkdir -p "$TARGET/memory"
      cp "$DOMAIN_DIR/memory/"* "$TARGET/memory/" 2>/dev/null || true
    else
      mkdir -p "$TARGET/memory"
      cp "$DOMAIN_DIR/memory/"* "$TARGET/memory/" 2>/dev/null || true
    fi
    log "  Memory files installed"
  fi
}

# Step 6: Merge settings
install_settings() {
  TEMPLATE="$PM_ROOT/Claude/templates/settings.json"
  EXISTING="$TARGET/settings.json"

  if [ ! -f "$TEMPLATE" ]; then
    warn "No settings template found. Skipping settings merge."
    return 0
  fi

  if [ -f "$EXISTING" ]; then
    log "Existing settings.json found. Merging (preserving your settings)..."
    # Use jq to merge if available, otherwise skip
    if command -v jq &>/dev/null; then
      # Merge: existing values take priority, but add new keys from template
      jq -s '.[0] * .[1] | .permissions.allow = (.[0].permissions.allow + .[1].permissions.allow | unique)' \
        "$TEMPLATE" "$EXISTING" > "$EXISTING.tmp" && mv "$EXISTING.tmp" "$EXISTING"
      log "  Settings merged (your values preserved, new keys added)"
    else
      warn "jq not found. Skipping settings merge. Install jq for automatic merging."
    fi
  else
    cp "$TEMPLATE" "$EXISTING"
    log "  Settings installed from template"
  fi
}

# Step 7: Post-install verification
verify_install() {
  echo ""
  log "=== Installation Summary ==="

  local total=0
  local component

  for component in agents commands skills hooks output-styles; do
    if [ -d "$TARGET/$component" ]; then
      count=$(find "$TARGET/$component" -type f | wc -l | tr -d ' ')
      total=$((total + count))
      log "  $component: $count files"
    fi
  done

  if [ -f "$TARGET/domain.json" ]; then
    domain_repo=$(python3 -c "import json; print(json.load(open('$TARGET/domain.json'))['repo'])" 2>/dev/null || echo "unknown")
    log "  Domain: $domain_repo"
    total=$((total + 1))
  else
    warn "  Domain: not configured (generic mode)"
  fi

  if [ -f "$TARGET/settings.json" ]; then
    log "  Settings: configured"
    total=$((total + 1))
  fi

  echo ""
  log "Total files installed: $total"
  log "Target: $TARGET"
  echo ""

  # Check for Claude CLI
  if command -v claude &>/dev/null; then
    log "Claude CLI: found ($(claude --version 2>/dev/null || echo 'unknown version'))"
  else
    warn "Claude CLI not found. Install it from: https://docs.anthropic.com/en/docs/claude-code"
  fi

  echo ""
  log "Run '/production-master' in Claude Code to verify setup."
}

# Main
main() {
  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   Production Master — Installer      ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
  echo ""

  find_pm_root
  determine_target
  detect_domain
  install_common
  install_domain
  install_settings
  verify_install
}

main "$@"
