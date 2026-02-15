#!/usr/bin/env bash
# Production Master — Cursor install
# Usage: from repo root: bash scripts/install-cursor.sh
# Creates .cursor/rules, .cursor/skills, and merges MCP into Cursor's mcp.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CURSOR_DIR="$REPO_ROOT/.cursor"
RULES_DIR="$CURSOR_DIR/rules"
SKILLS_DIR="$CURSOR_DIR/skills"

# Cursor MCP: macOS uses ~/.cursor/mcp.json; Linux ~/.config/cursor/mcp.json
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

# ─── Preflight ───────────────────────────────────────────────────────
header "Production Master — Cursor install"
echo ""

if ! command -v jq &>/dev/null; then
  err "jq is required. Install with: brew install jq"
  exit 1
fi
ok "jq available"

# ─── 1. Rules ────────────────────────────────────────────────────────
header "Step 1/3 — Cursor rules"

mkdir -p "$RULES_DIR"
RULE_FILE="$RULES_DIR/production-master.mdc"
cat > "$RULE_FILE" << 'RULE_END'
---
description: Production Master — slash commands and investigation pipeline (follow commands/production-master.md and agents when user invokes /production-master or related commands)
alwaysApply: true
---

# Production Master (Cursor)

When the user invokes **slash commands** for production investigation, follow the workflows in this repo.

## Slash commands

| User says | Action |
|-----------|--------|
| `/production-master <TICKET or args>` | Full pipeline: follow **commands/production-master.md** from start to finish. |
| `/grafana-query <args>` | Standalone Grafana: follow **commands/grafana-query.md**. |
| `/slack-search <args>` | Standalone Slack: follow **commands/slack-search.md**. |
| `/production-changes <args>` | PRs/commits/toggles: follow **commands/production-changes.md**. |
| `/resolve-artifact <args>` | Validate artifacts: follow **commands/resolve-artifact.md**. |
| `/fire-console <args>` | Fire Console gRPC: follow **commands/fire-console.md**. |
| `/update-context` | Domain config: follow **commands/update-context.md**. |
| `/git-update-agents` | Sync agents to repo: follow **commands/git-update-agents.md**. |

## Running the main pipeline (/production-master)

1. **Read** `commands/production-master.md` and execute its steps in order.
2. **No Task tool:** Cursor has no subagent Task. Whenever the orchestrator says "Launch Task with agent X" or "Launch one Task (model: sonnet)" for an agent:
   - **Read** the corresponding file under `agents/<agent-name>.md` (e.g. `agents/bug-context.md`).
   - **Execute** that agent's instructions yourself in this turn: same agent, same context.
   - **Write** the output to the path the orchestrator specifies (e.g. under `debug/debug-<ticket>-<timestamp>/<agent>/<agent>-output-V1.md`).
3. **Domain config:** Load from `~/.claude/production-master/domains/<repo-name>/domain.json` (or `.claude/domain.json` / `~/.claude/domain.json`). Repo name from `git remote get-url origin` (strip path and `.git`).
4. **MCP tools:** Use the MCP skill docs under `.cursor/skills/` (e.g. `grafana-datasource`, `fire-console`) for exact tool names and parameters when the orchestrator or command says to use an MCP.
5. **Parallel steps:** The orchestrator may say "Launch FOUR Tasks in the SAME message". Run those four agent steps **sequentially** (production-analyzer, then slack-analyzer, then codebase PRs, then Fire Console), each by reading the right `agents/*.md` and writing the specified output file.
6. **Output directory:** Create `debug/debug-<TICKET>-<date>-<time>/` (or `.claude/debug/...` if inside a repo that uses `.claude/debug`) and put all agent outputs there. Update `findings-summary.md` after each step as the orchestrator specifies.

## Skills (MCP)

For Grafana, Fire Console, Slack, Jira, GitHub, Octocode, FT-release, Context7, and Grafana-MCP, use the skill docs in `.cursor/skills/<name>/SKILL.md` for tool names, parameters, and workflows. Pass relevant skill content into context when the command or agent says to use that MCP.
RULE_END

ok "Created $RULE_FILE"

# ─── 2. Skills ───────────────────────────────────────────────────────
header "Step 2/3 — Cursor skills"

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

# ─── 3. MCP ─────────────────────────────────────────────────────────
header "Step 3/3 — MCP servers"

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
echo "    $RULES_DIR/production-master.mdc"
echo "    $SKILLS_DIR/<skill-name>/SKILL.md (9 skills)"
echo "  MCP config: $CURSOR_MCP"
echo ""
echo "  Next: Restart Cursor (or reload window), then use:"
echo "    /production-master <TICKET-ID>"
echo "    /grafana-query, /slack-search, /fire-console, /update-context, etc."
echo ""
