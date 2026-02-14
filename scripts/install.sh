#!/usr/bin/env bash
# Production Master — One-line installer
# Usage (private repo — requires gh CLI):
#   bash <(gh api repos/TamirCohen-Wix/production-master/contents/scripts/install.sh --jq '.content' | base64 -d)
# Usage (if repo becomes public):
#   bash <(curl -sL https://raw.githubusercontent.com/TamirCohen-Wix/production-master/main/scripts/install.sh)
set -euo pipefail

REPO="TamirCohen-Wix/production-master"
CLAUDE_JSON="$HOME/.claude.json"
SETTINGS_JSON="$HOME/.claude/settings.json"
MCP_CONNECT_URL="https://mcp-s-connect.wewix.net/mcp-servers"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; }
header(){ echo -e "\n${BOLD}$1${NC}"; }

# ─── Preflight checks ───────────────────────────────────────────────
header "Production Master Installer"
echo ""

if ! command -v claude &>/dev/null; then
  err "Claude Code CLI not found. Install it first: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi
ok "Claude Code CLI found"

if ! command -v gh &>/dev/null; then
  err "GitHub CLI (gh) not found. Install it first: https://cli.github.com"
  exit 1
fi
ok "GitHub CLI found"

if ! command -v jq &>/dev/null; then
  warn "jq not found — installing via Homebrew..."
  if command -v brew &>/dev/null; then
    brew install jq
  else
    err "jq is required but neither jq nor Homebrew are installed. Install jq manually."
    exit 1
  fi
fi
ok "jq available"

# ─── Step 1: Add marketplace & install plugin ────────────────────────
header "Step 1/4 — Install Plugin"

CLAUDECODE= claude plugin marketplace add "$REPO" 2>/dev/null || true
ok "Marketplace registered"

CLAUDECODE= claude plugin install production-master 2>/dev/null || true
ok "Plugin installed"

# ─── Step 2: Configure MCP servers ───────────────────────────────────
header "Step 2/4 — Configure MCP Servers"

# Download template via GitHub API (works for private repos)
TEMPLATE=$(gh api "repos/$REPO/contents/mcp-servers.json" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null || echo "")
if [ -z "$TEMPLATE" ]; then
  err "Failed to download MCP server template from GitHub API"
  exit 1
fi
ok "Downloaded MCP server template"

# Extract template server names
TEMPLATE_SERVERS=$(echo "$TEMPLATE" | jq -r '.mcpServers | keys[]')

# Read existing mcpServers from ~/.claude.json (or empty object)
if [ -f "$CLAUDE_JSON" ]; then
  EXISTING_SERVERS=$(jq -r '.mcpServers // {} | keys[]' "$CLAUDE_JSON" 2>/dev/null || echo "")
else
  EXISTING_SERVERS=""
fi

# Find missing servers
MISSING=()
for server in $TEMPLATE_SERVERS; do
  if ! echo "$EXISTING_SERVERS" | grep -qx "$server"; then
    MISSING+=("$server")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  ok "All 9 MCP servers already configured — skipping"
else
  info "Missing MCP servers: ${MISSING[*]}"
  echo ""
  echo -e "  Get your key at: ${BOLD}${MCP_CONNECT_URL}${NC}"
  echo ""
  read -rp "  Enter your MCP access key (or press Enter to skip): " ACCESS_KEY

  if [ -n "$ACCESS_KEY" ]; then
    # Build a JSON object with all servers, key substituted
    # Uses jq compatible with 1.6+ (no ?. operator)
    MERGE_JSON=$(echo "$TEMPLATE" | jq --arg key "$ACCESS_KEY" '
      .mcpServers | to_entries | map(
        .value |= (
          if (.env // {}).USER_ACCESS_KEY == "<YOUR_ACCESS_KEY>" then
            .env.USER_ACCESS_KEY = $key
          else . end
          | if (.headers // {})."x-user-access-key" == "<YOUR_ACCESS_KEY>" then
              .headers."x-user-access-key" = $key
            else . end
        )
      ) | from_entries
    ')

    # Filter to only missing servers
    MISSING_JSON="$MERGE_JSON"
    for server in $TEMPLATE_SERVERS; do
      if echo "$EXISTING_SERVERS" | grep -qx "$server"; then
        MISSING_JSON=$(echo "$MISSING_JSON" | jq --arg s "$server" 'del(.[$s])')
      fi
    done

    # Merge into ~/.claude.json — only add, never override
    if [ -f "$CLAUDE_JSON" ]; then
      UPDATED=$(jq --argjson new "$MISSING_JSON" '
        .mcpServers = ((.mcpServers // {}) + $new)
      ' "$CLAUDE_JSON")
    else
      UPDATED=$(jq -n --argjson new "$MISSING_JSON" '{ mcpServers: $new }')
    fi

    echo "$UPDATED" > "$CLAUDE_JSON"
    ok "Added ${#MISSING[@]} MCP servers: ${MISSING[*]}"
  else
    warn "Skipped MCP setup — configure manually later via mcp-servers.json"
  fi
fi

# ─── Step 3: Enable Agent Teams ──────────────────────────────────────
header "Step 3/4 — Enable Agent Teams"

mkdir -p "$(dirname "$SETTINGS_JSON")"

if [ -f "$SETTINGS_JSON" ]; then
  HAS_TEAMS=$(jq -r '.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS // ""' "$SETTINGS_JSON" 2>/dev/null || echo "")
else
  HAS_TEAMS=""
fi

if [ "$HAS_TEAMS" = "1" ]; then
  ok "Agent teams already enabled"
else
  if [ -f "$SETTINGS_JSON" ]; then
    UPDATED_SETTINGS=$(jq '.env = ((.env // {}) + {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"})' "$SETTINGS_JSON")
  else
    UPDATED_SETTINGS='{"env":{"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS":"1"}}'
  fi
  echo "$UPDATED_SETTINGS" > "$SETTINGS_JSON"
  ok "Agent teams enabled in settings.json"
fi

# ─── Step 4: Summary ─────────────────────────────────────────────────
header "Step 4/4 — Done!"
echo ""
echo -e "  ${GREEN}Production Master is installed and ready.${NC}"
echo ""
echo "  Next steps:"
echo "    1. Open Claude Code in your repo"
echo "    2. Run /update-context to set up your domain config"
echo "    3. Run /production-master <TICKET-ID> to investigate"
echo ""
