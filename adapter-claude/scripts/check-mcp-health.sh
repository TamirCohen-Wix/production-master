#!/usr/bin/env bash
# Production Master — MCP Health Check
# Checks if MCP server configs exist in ~/.claude.json
# Always exits 0 — never blocks a session
set -uo pipefail

CLAUDE_JSON="$HOME/.claude.json"

if [ ! -f "$CLAUDE_JSON" ]; then
  echo "[WARN] ~/.claude.json not found — MCP servers are not configured"
  echo "       Run: bash adapter-claude/scripts/install.sh"
  exit 0
fi

SERVER_COUNT=$(jq -r '.mcpServers // {} | keys | length' "$CLAUDE_JSON" 2>/dev/null || echo "0")

if [ "$SERVER_COUNT" -eq 0 ]; then
  echo "[WARN] No MCP servers found in ~/.claude.json"
  echo "       Run: bash adapter-claude/scripts/install.sh"
else
  echo "[OK] $SERVER_COUNT MCP server(s) configured"
fi

exit 0
