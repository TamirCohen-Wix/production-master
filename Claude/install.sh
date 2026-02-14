#!/usr/bin/env bash
set -euo pipefail

# Production Master Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/TamirCohen-Wix/production-master/main/Claude/install.sh | bash
#   ./install.sh                     (from repo root or any directory)
#   ./install.sh --with-settings     (also merge settings.json)
#   ./install.sh --uninstall         (remove all production-master files)

REPO_URL="https://github.com/TamirCohen-Wix/production-master.git"
WITH_SETTINGS=false
UNINSTALL=false
SCRIPT_DIR=""
PM_ROOT=""
TARGET="$HOME/.claude"
PM_DIR="$HOME/.claude/production-master"

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
    --with-settings) WITH_SETTINGS=true ;;
    --uninstall) UNINSTALL=true ;;
    --help|-h)
      echo "Production Master Installer"
      echo ""
      echo "Usage:"
      echo "  ./install.sh                  Install pipeline to ~/.claude/ (never touches repo .claude/)"
      echo "  ./install.sh --with-settings  Also merge recommended settings into ~/.claude/settings.json"
      echo "  ./install.sh --uninstall      Remove all production-master files from ~/.claude/"
      echo ""
      echo "The installer will:"
      echo "  1. Install pipeline components (agents, skills, commands, hooks, output-styles) to ~/.claude/"
      echo "  2. Detect if you're in a git repo and find matching domain config"
      echo "  3. Store domain config under ~/.claude/production-master/domains/<repo>/"
      echo "  4. Write a manifest for clean uninstall"
      echo ""
      echo "Your repo's .claude/ directory is NEVER modified."
      exit 0
      ;;
  esac
done

# Uninstall flow
do_uninstall() {
  echo ""
  echo -e "${RED}╔══════════════════════════════════════╗${NC}"
  echo -e "${RED}║   Production Master — Uninstall      ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════╝${NC}"
  echo ""

  MANIFEST="$PM_DIR/manifest.txt"

  if [ ! -f "$MANIFEST" ]; then
    warn "No manifest found at $MANIFEST. Nothing to uninstall."
    warn "If you installed manually, remove files from ~/.claude/ that came from production-master."
    exit 0
  fi

  log "Reading manifest..."
  local count=0

  # Remove each file listed in the manifest
  while IFS= read -r file; do
    if [ -f "$file" ]; then
      rm -f "$file"
      count=$((count + 1))
    fi
  done < "$MANIFEST"

  # Clean up empty directories left behind
  for dir in "$TARGET"/{agents,commands,skills,hooks,output-styles}; do
    if [ -d "$dir" ]; then
      find "$dir" -type d -empty -delete 2>/dev/null || true
    fi
  done

  # Remove production-master directory (domains, manifest)
  if [ -d "$PM_DIR" ]; then
    rm -rf "$PM_DIR"
    log "Removed $PM_DIR"
  fi

  echo ""
  log "Uninstalled $count files."
  log "Your ~/.claude/settings.json was NOT modified (remove manually if needed)."
  log "Your repo .claude/ directories were never touched — nothing to clean there."
}

if $UNINSTALL; then
  do_uninstall
  exit 0
fi

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

# Step 2: Detect current repo (for domain matching only — we don't install there)
detect_repo() {
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
  REPO_NAME=""

  if [ -n "$REPO_ROOT" ] && [ "$REPO_ROOT" != "$PM_ROOT" ]; then
    REMOTE_URL=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
      REPO_NAME=$(echo "$REMOTE_URL" | sed -E 's#.*/##; s#\.git$##')
      log "Detected repo: $REPO_NAME (at $REPO_ROOT)"
    fi
  fi
}

# Step 3: Detect domain
detect_domain() {
  DOMAIN_DIR=""

  if [ -z "$REPO_NAME" ]; then
    return 0
  fi

  # Search Domain/ for matching repo
  if [ -d "$PM_ROOT/Domain" ]; then
    FOUND=$(find "$PM_ROOT/Domain" -name "domain.json" -exec grep -l "\"repo\": \"$REPO_NAME\"" {} \; 2>/dev/null | head -1)
    if [ -n "$FOUND" ]; then
      DOMAIN_DIR="$(dirname "$FOUND")"
      log "Found domain config: $DOMAIN_DIR"
    else
      warn "No domain config found for repo '$REPO_NAME'."
      log "Run '/update-context' in Claude Code to create one."
    fi
  fi
}

# Manifest tracking — append each installed file
MANIFEST_TMP=""
manifest_init() {
  mkdir -p "$PM_DIR"
  MANIFEST_TMP=$(mktemp)
}
manifest_add() {
  echo "$1" >> "$MANIFEST_TMP"
}
manifest_save() {
  sort -u "$MANIFEST_TMP" > "$PM_DIR/manifest.txt"
  rm -f "$MANIFEST_TMP"
}

# Step 4: Install Common layer
install_common() {
  log "Installing Common layer to ~/.claude/ ..."

  # Create target directories
  mkdir -p "$TARGET"/{agents,commands,skills,hooks,output-styles}

  # Copy agents
  if [ -d "$PM_ROOT/Common/agents" ]; then
    for f in "$PM_ROOT/Common/agents/"*.md; do
      cp "$f" "$TARGET/agents/"
      manifest_add "$TARGET/agents/$(basename "$f")"
    done
    log "  Agents: $(ls "$PM_ROOT/Common/agents/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy commands
  if [ -d "$PM_ROOT/Common/commands" ]; then
    for f in "$PM_ROOT/Common/commands/"*.md; do
      cp "$f" "$TARGET/commands/"
      manifest_add "$TARGET/commands/$(basename "$f")"
    done
    log "  Commands: $(ls "$PM_ROOT/Common/commands/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy skills (preserve directory structure)
  if [ -d "$PM_ROOT/Common/skills" ]; then
    for skill_dir in "$PM_ROOT/Common/skills"/*/; do
      skill_name=$(basename "$skill_dir")
      mkdir -p "$TARGET/skills/$skill_name"
      for f in "$skill_dir"*; do
        [ -f "$f" ] || continue
        cp "$f" "$TARGET/skills/$skill_name/"
        manifest_add "$TARGET/skills/$skill_name/$(basename "$f")"
      done
    done
    log "  Skills: $(ls -d "$PM_ROOT/Common/skills"/*/ 2>/dev/null | wc -l | tr -d ' ') directories"
  fi

  # Copy hooks
  if [ -d "$PM_ROOT/Common/hooks" ]; then
    for f in "$PM_ROOT/Common/hooks/"*; do
      [ -f "$f" ] || continue
      cp "$f" "$TARGET/hooks/"
      manifest_add "$TARGET/hooks/$(basename "$f")"
    done
    chmod +x "$TARGET/hooks/"*.sh 2>/dev/null || true
    log "  Hooks: $(ls "$PM_ROOT/Common/hooks/"* 2>/dev/null | wc -l | tr -d ' ') files"
  fi

  # Copy output styles
  if [ -d "$PM_ROOT/Common/output-styles" ]; then
    for f in "$PM_ROOT/Common/output-styles/"*.md; do
      cp "$f" "$TARGET/output-styles/"
      manifest_add "$TARGET/output-styles/$(basename "$f")"
    done
    log "  Output styles: $(ls "$PM_ROOT/Common/output-styles/"*.md 2>/dev/null | wc -l | tr -d ' ') files"
  fi
}

# Step 5: Install domain context (to ~/.claude/production-master/domains/<repo>/)
install_domain() {
  if [ -z "$DOMAIN_DIR" ]; then
    log "No domain context to install."
    return 0
  fi

  if [ -z "$REPO_NAME" ]; then
    return 0
  fi

  local DOMAIN_TARGET="$PM_DIR/domains/$REPO_NAME"
  mkdir -p "$DOMAIN_TARGET/memory"

  log "Installing domain context to: $DOMAIN_TARGET"

  # Copy domain.json
  if [ -f "$DOMAIN_DIR/domain.json" ]; then
    cp "$DOMAIN_DIR/domain.json" "$DOMAIN_TARGET/domain.json"
    manifest_add "$DOMAIN_TARGET/domain.json"
    log "  domain.json installed"
  fi

  # Copy CLAUDE.md (as reference — NOT into repo .claude/)
  if [ -f "$DOMAIN_DIR/CLAUDE.md" ]; then
    cp "$DOMAIN_DIR/CLAUDE.md" "$DOMAIN_TARGET/CLAUDE.md"
    manifest_add "$DOMAIN_TARGET/CLAUDE.md"
    log "  CLAUDE.md installed (reference copy — not injected into repo)"
  fi

  # Copy memory
  if [ -d "$DOMAIN_DIR/memory" ]; then
    for f in "$DOMAIN_DIR/memory/"*; do
      [ -f "$f" ] || continue
      cp "$f" "$DOMAIN_TARGET/memory/"
      manifest_add "$DOMAIN_TARGET/memory/$(basename "$f")"
    done
    log "  Memory files installed"
  fi
}

# Step 6: Merge settings (opt-in only)
install_settings() {
  if ! $WITH_SETTINGS; then
    log "Settings merge skipped (use --with-settings to opt in)."
    return 0
  fi

  TEMPLATE="$PM_ROOT/Claude/templates/settings.json"
  EXISTING="$TARGET/settings.json"

  if [ ! -f "$TEMPLATE" ]; then
    warn "No settings template found. Skipping."
    return 0
  fi

  if [ -f "$EXISTING" ]; then
    log "Merging settings (preserving your existing values)..."
    if command -v jq &>/dev/null; then
      jq -n '
        def deep_merge(a; b):
          a as $a | b as $b |
          if ($a | type) == "object" and ($b | type) == "object" then
            (($a | keys) + ($b | keys)) | unique | map(
              . as $k |
              if ($a | has($k)) and ($b | has($k)) then
                {($k): deep_merge($a[$k]; $b[$k])}
              elif ($b | has($k)) then
                {($k): $b[$k]}
              else
                {($k): $a[$k]}
              end
            ) | add // {}
          elif ($a | type) == "array" and ($b | type) == "array" then
            ($a + $b) | unique
          else
            $b
          end;
        deep_merge(input; input)
      ' "$TEMPLATE" "$EXISTING" > "$EXISTING.tmp" && mv "$EXISTING.tmp" "$EXISTING" \
        && log "  Settings merged (your values preserved, new keys added)" \
        || { warn "jq merge failed. Keeping existing settings.json unchanged."; rm -f "$EXISTING.tmp"; }
    else
      warn "jq not found. Skipping settings merge."
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

  if [ -n "$REPO_NAME" ] && [ -f "$PM_DIR/domains/$REPO_NAME/domain.json" ]; then
    domain_repo=$(python3 -c "import json; print(json.load(open('$PM_DIR/domains/$REPO_NAME/domain.json'))['repo'])" 2>/dev/null || echo "unknown")
    log "  Domain: $domain_repo"
    total=$((total + 1))
  else
    warn "  Domain: not configured (generic mode)"
  fi

  echo ""
  log "Total files installed: $total"
  log "Target: $TARGET"
  log "Domain dir: $PM_DIR/domains/"
  log "Manifest: $PM_DIR/manifest.txt"
  echo ""

  # Check for Claude CLI
  if command -v claude &>/dev/null; then
    log "Claude CLI: found ($(claude --version 2>/dev/null || echo 'unknown version'))"
  else
    warn "Claude CLI not found. Install it from: https://docs.anthropic.com/en/docs/claude-code"
  fi

  echo ""
  if ! $WITH_SETTINGS; then
    log "Settings were NOT merged. To add recommended hooks & permissions:"
    log "  ./install.sh --with-settings"
  fi
  echo ""
  log "Repo .claude/ was NOT modified."
  log "To uninstall: ./install.sh --uninstall"
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
  detect_repo
  detect_domain
  manifest_init
  install_common
  install_domain
  install_settings
  manifest_save
  verify_install
}

main "$@"
