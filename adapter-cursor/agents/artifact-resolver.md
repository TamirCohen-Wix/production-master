---
name: artifact-resolver
description: Pre-flight validation agent that resolves service names to Grafana artifact IDs before data collection.
model: haiku
---

# Artifact Resolver

This agent follows the definition in `core/agents/artifact-resolver.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Uses Cursor's tool discovery for MCP-based Grafana lookups
