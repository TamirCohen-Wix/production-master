#!/usr/bin/env bash
# Production Master — Cursor install
# Usage: from repo root: bash scripts/install-cursor.sh [TARGET_DIR]
#   TARGET_DIR: where to install commands, agents, skills (default: ~/.cursor)
#   Examples: ~/.cursor  /path/to/project/.cursor  .cursor
# Creates TARGET_DIR/commands, TARGET_DIR/agents, TARGET_DIR/skills, and merges MCP into Cursor's mcp.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMMANDS_SRC="$REPO_ROOT/commands"
AGENTS_SRC="$REPO_ROOT/agents"

# Target directory: first argument or default to user's global Cursor config
TARGET_DIR="${1:-$HOME/.cursor}"
mkdir -p "$TARGET_DIR"
# Resolve to absolute path (relative paths are from current dir when script runs)
CURSOR_DIR="$(cd "$TARGET_DIR" && pwd)"

COMMANDS_DIR="$CURSOR_DIR/commands"
AGENTS_DIR="$CURSOR_DIR/agents"
SKILLS_DIR="$CURSOR_DIR/skills"

# Cursor MCP: always merge into user-level config (Cursor reads MCP from here)
if [[ "$(uname)" == "Darwin" ]]; then
  CURSOR_MCP="$HOME/.cursor/mcp.json"
else
  CURSOR_MCP="${XDG_CONFIG_HOME:-$HOME/.config}/cursor/mcp.json"
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; }
header(){ echo -e "\n${BOLD}$1${NC}"; }

# Strip YAML frontmatter (--- ... ---) from markdown; Cursor commands are plain Markdown only.
# If there is no frontmatter (no ---), the whole file is printed.
strip_frontmatter() {
  awk '/^---$/ { block++; if (block <= 2) next } block != 1' "$1"
}

# ─── Preflight ───────────────────────────────────────────────────────
header "Production Master — Cursor install"
echo ""

ok "Target directory: $CURSOR_DIR"

if ! command -v jq &>/dev/null; then
  err "jq is required. Install with: brew install jq"
  exit 1
fi
ok "jq available"

# Remove legacy rule (commands and agents are now installed natively, not via a rule)
RULE_FILE="$CURSOR_DIR/rules/production-master.mdc"
if [ -f "$RULE_FILE" ]; then
  rm -f "$RULE_FILE"
  ok "Removed legacy rule (using native commands and agents)"
fi

# ─── 1. Commands (Cursor slash commands: .cursor/commands/*.md) ───────
header "Step 1/4 — Cursor commands"

mkdir -p "$COMMANDS_DIR"
CMD_COUNT=0
for src in "$COMMANDS_SRC"/*.md; do
  [ -f "$src" ] || continue
  name=$(basename "$src" .md)
  dest="$COMMANDS_DIR/$name.md"
  if [ "$name" = "production-master" ]; then
    # Prepend Cursor-specific instructions: no Task tool; run agents from install dir
    {
      echo "# Cursor: single agent — no Task tool. When this doc says \"Launch Task with agent X\", read $AGENTS_DIR/X.md and execute those instructions yourself in this turn; write output to the path specified. Use $SKILLS_DIR/<name>/SKILL.md for MCP tool names and parameters."
      echo ''
      strip_frontmatter "$src"
    } > "$dest"
  else
    strip_frontmatter "$src" > "$dest"
  fi
  ok "Installed command: /$name"
  CMD_COUNT=$((CMD_COUNT + 1))
done
ok "Installed $CMD_COUNT slash commands in $COMMANDS_DIR"

# ─── 2. Agents (sub-agent definitions: .cursor/agents/*.md) ───────────
header "Step 2/4 — Cursor agents"

mkdir -p "$AGENTS_DIR"
AGENT_COUNT=0
for src in "$AGENTS_SRC"/*.md; do
  [ -f "$src" ] || continue
  name=$(basename "$src" .md)
  cp "$src" "$AGENTS_DIR/$name.md"
  ok "Installed agent: $name"
  AGENT_COUNT=$((AGENT_COUNT + 1))
done
ok "Installed $AGENT_COUNT agents in $AGENTS_DIR"

# ─── 3. Skills ───────────────────────────────────────────────────────
header "Step 3/4 — Cursor skills"

mkdir -p "$SKILLS_DIR"
SKILL_SRC="$REPO_ROOT/skills"
for dir in "$SKILL_SRC"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  if [ ! -f "$dir/SKILL.md" ]; then continue; fi
  dest="$SKILLS_DIR/$name"
  mkdir -p "$dest"
  cp "$dir/SKILL.md" "$dest/SKILL.md"
  # Ensure frontmatter has "name" for Cursor (add if missing)
  if ! grep -q '^name:' "$dest/SKILL.md" 2>/dev/null; then
    if head -1 "$dest/SKILL.md" | grep -q '^---'; then
      (head -1 "$dest/SKILL.md"; echo "name: $name"; tail -n +2 "$dest/SKILL.md") > "$dest/SKILL.md.tmp"
      mv "$dest/SKILL.md.tmp" "$dest/SKILL.md"
    fi
  fi
  ok "Installed skill: $name"
done

# ─── 4. MCP ─────────────────────────────────────────────────────────
header "Step 4/4 — MCP servers"

MCP_TEMPLATE="$REPO_ROOT/mcp-servers.json"
if [ ! -f "$MCP_TEMPLATE" ]; then
  err "mcp-servers.json not found at $MCP_TEMPLATE"
  exit 1
fi

TEMPLATE_SERVERS=$(jq -r '.mcpServers | keys[]' "$MCP_TEMPLATE")
mkdir -p "$(dirname "$CURSOR_MCP")"

if [ -f "$CURSOR_MCP" ]; then
  EXISTING_SERVERS=$(jq -r '.mcpServers // {} | keys[]' "$CURSOR_MCP" 2>/dev/null || echo "")
else
  EXISTING_SERVERS=""
fi

MISSING=()
for server in $TEMPLATE_SERVERS; do
  if ! echo "$EXISTING_SERVERS" | grep -qx "$server"; then
    MISSING+=("$server")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  ok "All MCP servers already in Cursor config — skipping"
else
  info "Missing in Cursor MCP config: ${MISSING[*]}"
  ACCESS_KEY=""
  if [ -f "$CURSOR_MCP" ]; then
    ACCESS_KEY=$(jq -r '
      .mcpServers // {} | to_entries[]
      | (.value.env.USER_ACCESS_KEY // .value.headers."x-user-access-key" // empty)
    ' "$CURSOR_MCP" 2>/dev/null | head -1 || echo "")
  fi
  if [ -z "$ACCESS_KEY" ]; then
    echo ""
    echo "  Get your key at: https://mcp-s-connect.wewix.net/mcp-servers"
    echo ""
    read -rp "  Enter your MCP access key (or Enter to skip): " ACCESS_KEY
  else
    ok "Reusing access key from existing Cursor MCP config"
  fi

  if [ -n "$ACCESS_KEY" ]; then
    MERGE_JSON=$(jq -c --arg key "$ACCESS_KEY" '
      .mcpServers | to_entries | map(
        .value |= (
          if (.env // {}).USER_ACCESS_KEY == "<YOUR_ACCESS_KEY>" then .env.USER_ACCESS_KEY = $key else . end
          | if (.headers // {})."x-user-access-key" == "<YOUR_ACCESS_KEY>" then .headers."x-user-access-key" = $key else . end
        )
      ) | from_entries
    ' "$MCP_TEMPLATE")
    for server in $TEMPLATE_SERVERS; do
      if echo "$EXISTING_SERVERS" | grep -qx "$server"; then
        MERGE_JSON=$(echo "$MERGE_JSON" | jq -c --arg s "$server" 'del(.[$s])')
      fi
    done
    if [ -f "$CURSOR_MCP" ]; then
      UPDATED=$(jq --argjson new "$MERGE_JSON" '.mcpServers = ((.mcpServers // {}) + $new)' "$CURSOR_MCP")
    else
      UPDATED=$(jq -n --argjson new "$MERGE_JSON" '{ mcpServers: $new }')
    fi
    echo "$UPDATED" > "$CURSOR_MCP"
    ok "Added ${#MISSING[@]} MCP servers to $CURSOR_MCP"
  else
    warn "Skipped MCP setup — add servers manually to $CURSOR_MCP using mcp-servers.json as template"
  fi
fi

# ─── Done ───────────────────────────────────────────────────────────
header "Done"
echo ""
echo -e "  ${GREEN}Cursor setup complete.${NC}"
echo ""
echo "  Created:"
echo "    $COMMANDS_DIR/*.md ($CMD_COUNT slash commands)"
echo "    $AGENTS_DIR/*.md ($AGENT_COUNT agents)"
echo "    $SKILLS_DIR/<skill-name>/SKILL.md (9 skills)"
echo "  MCP config: $CURSOR_MCP"
echo ""
echo "  Next: Restart Cursor (or reload window), then use:"
echo "    /production-master <TICKET-ID>"
echo "    /grafana-query, /slack-search, /fire-console, /update-context, etc."
echo ""
