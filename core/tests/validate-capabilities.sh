#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="$ROOT_DIR/core/capabilities/registry.yaml"
INTERFACES_DIR="$ROOT_DIR/core/capabilities/interfaces"
CUSTOM_MCP_DIR="$ROOT_DIR/custom-mcps"
KNOWLEDGE_DIR="$ROOT_DIR/.production-master/knowledge"

errors=0

if [ ! -f "$REGISTRY" ]; then
  echo "FAIL: missing capability registry: $REGISTRY"
  exit 1
fi

EXPECTED_INTERFACES=(
  "ticket-system.json"
  "log-system.json"
  "code-search.json"
  "team-communications.json"
  "version-control.json"
  "feature-flags.json"
  "domain-objects.json"
  "documentation.json"
  "service-registry.json"
)

for file in "${EXPECTED_INTERFACES[@]}"; do
  if [ ! -s "$INTERFACES_DIR/$file" ]; then
    echo "FAIL: missing or empty interface schema: $file"
    errors=$((errors + 1))
  fi
done

# Validate all 6 custom MCP servers exist
EXPECTED_CUSTOM_MCPS=(
  "log-system"
  "ticket-system"
  "code-search"
  "team-comms"
  "version-control"
  "feature-flags"
)

for mcp in "${EXPECTED_CUSTOM_MCPS[@]}"; do
  mcp_index="$CUSTOM_MCP_DIR/$mcp/src/index.ts"
  mcp_pkg="$CUSTOM_MCP_DIR/$mcp/package.json"
  mcp_tsconfig="$CUSTOM_MCP_DIR/$mcp/tsconfig.json"

  if [ ! -s "$mcp_index" ]; then
    echo "FAIL: missing or empty custom MCP source: $mcp/src/index.ts"
    errors=$((errors + 1))
  fi
  if [ ! -s "$mcp_pkg" ]; then
    echo "FAIL: missing or empty custom MCP package.json: $mcp/package.json"
    errors=$((errors + 1))
  fi
  if [ ! -s "$mcp_tsconfig" ]; then
    echo "FAIL: missing or empty custom MCP tsconfig.json: $mcp/tsconfig.json"
    errors=$((errors + 1))
  fi
done

if [ ! -d "$KNOWLEDGE_DIR" ]; then
  echo "FAIL: missing knowledge registry directory: $KNOWLEDGE_DIR"
  errors=$((errors + 1))
else
  for required in \
    "$KNOWLEDGE_DIR/known-issues/auth-service.yaml" \
    "$KNOWLEDGE_DIR/patterns/auth-service.yaml" \
    "$KNOWLEDGE_DIR/service-graph.yaml"; do
    if [ ! -s "$required" ]; then
      echo "FAIL: missing knowledge file: $required"
      errors=$((errors + 1))
    fi
  done
fi

if [ "$errors" -gt 0 ]; then
  echo "FAILED: $errors validation error(s)"
  exit 1
fi

echo "SUCCESS: capability and knowledge validation passed"
