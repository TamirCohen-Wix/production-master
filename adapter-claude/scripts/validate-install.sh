#!/usr/bin/env bash
# Production Master — Installation Validator & Debugger
# Run this to diagnose why commands/agents/skills aren't loading
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()    { echo -e "  ${GREEN}OK${NC}   $1"; }
fail()  { echo -e "  ${RED}FAIL${NC} $1"; TOTAL_ERRORS=$((TOTAL_ERRORS + 1)); }
warn()  { echo -e "  ${YELLOW}WARN${NC} $1"; }
info()  { echo -e "  ${BLUE}INFO${NC} $1"; }
header(){ echo -e "\n${BOLD}═══ $1 ═══${NC}"; }

TOTAL_ERRORS=0
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$REPO_DIR"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_JSON="$HOME/.claude.json"
SETTINGS_JSON="$CLAUDE_DIR/settings.json"
INSTALLED_PLUGINS="$CLAUDE_DIR/plugins/installed_plugins.json"

echo -e "${BOLD}Production Master — Installation Diagnostics${NC}"
echo -e "Repo:   ${BLUE}$REPO_DIR${NC}"
echo -e "Plugin: ${BLUE}$PLUGIN_DIR${NC}"
echo -e "Date:   $(date)"
echo ""

# ═══════════════════════════════════════════════════════════════════════
header "1. Source Directory"
# ═══════════════════════════════════════════════════════════════════════

REPO_ROOT="$(cd "$PLUGIN_DIR/.." && pwd)"
declare -A DIR_MAP=(
  [commands]="$PLUGIN_DIR/commands"
  [agents]="$REPO_ROOT/core/agents"
  [skills]="$REPO_ROOT/core/skills"
  [hooks]="$PLUGIN_DIR/hooks"
)
for dir in commands agents skills hooks; do
  DIR_PATH="${DIR_MAP[$dir]}"
  if [ -d "$DIR_PATH" ]; then
    count=$(ls "$DIR_PATH" | wc -l | tr -d ' ')
    ok "$dir/ ($count items)"
  else
    fail "$dir/ — MISSING from source (expected: $DIR_PATH)"
  fi
done

if [ -f "$PLUGIN_DIR/.claude-plugin/plugin.json" ]; then
  ok ".claude-plugin/plugin.json exists"
  PLUGIN_NAME=$(jq -r '.name' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null || echo "UNKNOWN")
  info "Plugin name: $PLUGIN_NAME"
else
  fail ".claude-plugin/plugin.json — MISSING"
fi

if [ -f "$REPO_DIR/.claude-plugin/marketplace.json" ]; then
  ok ".claude-plugin/marketplace.json exists"
  SOURCE=$(jq -r '.plugins[0].source' "$REPO_DIR/.claude-plugin/marketplace.json" 2>/dev/null || echo "UNKNOWN")
  info "Plugin source path: $SOURCE"
  if [ "$SOURCE" = "./" ]; then
    ok "Source path: ./ (root-level plugin)"
  elif [ "$SOURCE" = "." ]; then
    fail "Source is '.' — use './' instead"
  else
    info "Source: $SOURCE"
  fi
else
  fail ".claude-plugin/marketplace.json — MISSING"
fi

# ═══════════════════════════════════════════════════════════════════════
header "2. Plugin System Status"
# ═══════════════════════════════════════════════════════════════════════

# Check plugin list
if command -v claude &>/dev/null; then
  PLUGIN_STATUS=$(CLAUDECODE= claude plugin list 2>&1 || true)
  if echo "$PLUGIN_STATUS" | grep -q "Status: ✔ enabled"; then
    ok "Plugin status: enabled"
  elif echo "$PLUGIN_STATUS" | grep -q "Status: ✘ failed"; then
    ERROR_MSG=$(echo "$PLUGIN_STATUS" | grep "Error:" | head -1)
    fail "Plugin status: failed to load"
    info "$ERROR_MSG"
  elif echo "$PLUGIN_STATUS" | grep -q "production-master"; then
    warn "Plugin registered but status unclear"
    echo "$PLUGIN_STATUS" | head -5
  else
    fail "Plugin not installed — run: claude plugin install production-master"
  fi
else
  warn "Claude Code CLI not found — skipping plugin status check"
fi

# Check install path
INSTALL_PATH=""
if [ -f "$INSTALLED_PLUGINS" ]; then
  INSTALL_PATH=$(jq -r '.plugins["production-master@production-master"][0].installPath // ""' "$INSTALLED_PLUGINS" 2>/dev/null || echo "")
fi

if [ -n "$INSTALL_PATH" ] && [ -d "$INSTALL_PATH" ]; then
  ok "Install path exists: $INSTALL_PATH"
else
  fail "Install path missing or not set"
  if [ -n "$INSTALL_PATH" ]; then
    info "Expected: $INSTALL_PATH"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
header "3. Installed Content (from plugin cache)"
# ═══════════════════════════════════════════════════════════════════════

if [ -n "$INSTALL_PATH" ] && [ -d "$INSTALL_PATH" ]; then

  # Check commands
  info "Commands:"
  EXPECTED_COMMANDS=(production-master.md git-update-agents.md update-context.md fire-console.md grafana-query.md production-changes.md resolve-artifact.md slack-search.md)
  for cmd in "${EXPECTED_COMMANDS[@]}"; do
    if [ -f "$INSTALL_PATH/commands/$cmd" ]; then
      ok "  $cmd"
    else
      fail "  $cmd — MISSING"
    fi
  done

  # Check agents
  info "Agents:"
  EXPECTED_AGENTS=(bug-context.md change-analyzer.md codebase-semantics.md comms-analyzer.md documenter.md fix-list.md hypotheses.md log-analyzer.md publisher.md service-resolver.md skeptic.md verifier.md)
  for agent in "${EXPECTED_AGENTS[@]}"; do
    if [ -f "$INSTALL_PATH/agents/$agent" ]; then
      ok "  $agent"
    else
      fail "  $agent — MISSING"
    fi
  done

  # Check skills
  info "Skills:"
  EXPECTED_SKILLS=(context7 fire-console ft-release github grafana-datasource grafana-mcp jira octocode slack)
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ -d "$INSTALL_PATH/skills/$skill" ] && [ -f "$INSTALL_PATH/skills/$skill/SKILL.md" ]; then
      ok "  $skill/"
    elif [ -d "$INSTALL_PATH/skills/$skill" ]; then
      warn "  $skill/ (no SKILL.md)"
    else
      fail "  $skill/ — MISSING"
    fi
  done

  # Check for excessive nesting (recursion bug)
  NESTED_COUNT=$(find "$INSTALL_PATH" -maxdepth 6 -name "production-master" -type d 2>/dev/null | wc -l | tr -d ' ')
  if [ "$NESTED_COUNT" -gt 1 ]; then
    NESTED_DEPTH=$(find "$INSTALL_PATH/production-master" -maxdepth 5 -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$NESTED_DEPTH" -gt 0 ]; then
      fail "Recursive nesting: production-master/ contains $NESTED_DEPTH files (should be empty)"
    else
      ok "No recursive nesting (production-master/ subdirectory is empty)"
    fi
  else
    ok "No nested directories"
  fi
else
  fail "Cannot check installed content — install path not found"
fi

# ═══════════════════════════════════════════════════════════════════════
header "4. Settings ($SETTINGS_JSON)"
# ═══════════════════════════════════════════════════════════════════════

if [ -f "$SETTINGS_JSON" ]; then
  TEAMS=$(jq -r '.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS // ""' "$SETTINGS_JSON" 2>/dev/null)
  if [ "$TEAMS" = "1" ]; then
    ok "Agent teams: enabled"
  else
    warn "Agent teams: not enabled"
  fi

  PLUGIN_ENABLED=$(jq -r '.enabledPlugins["production-master@production-master"] // ""' "$SETTINGS_JSON" 2>/dev/null)
  if [ "$PLUGIN_ENABLED" = "true" ]; then
    ok "Plugin enabled in settings"
  else
    info "Plugin not in enabledPlugins (may be auto-enabled)"
  fi
else
  fail "settings.json not found"
fi

# ═══════════════════════════════════════════════════════════════════════
header "5. MCP Servers ($CLAUDE_JSON)"
# ═══════════════════════════════════════════════════════════════════════

REQUIRED_MCPS=(octocode Slack jira grafana-datasource FT-release github context-7 grafana-mcp fire-console)
if [ -f "$CLAUDE_JSON" ]; then
  for mcp in "${REQUIRED_MCPS[@]}"; do
    if jq -e ".mcpServers.\"$mcp\"" "$CLAUDE_JSON" &>/dev/null; then
      ok "$mcp"
    else
      fail "$mcp — NOT CONFIGURED"
    fi
  done
else
  fail "$CLAUDE_JSON not found"
fi

# ═══════════════════════════════════════════════════════════════════════
header "Summary"
# ═══════════════════════════════════════════════════════════════════════

echo ""
if [ "$TOTAL_ERRORS" -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}All checks passed (0 errors)${NC}"
  echo ""
  echo "  Restart Claude Code / Cursor and try: /production-master"
else
  echo -e "  ${RED}${BOLD}$TOTAL_ERRORS errors found${NC}"
  echo ""
  echo "  To fix, run:"
  echo "    bash $REPO_DIR/scripts/install.sh"
fi
echo ""
