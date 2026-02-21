---
name: service-resolver
description: Pre-flight validation agent that validates and resolves service identifiers before data collection.
model: haiku
---

# Service Resolver

This agent follows the definition in `core/agents/service-resolver.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Service validation routed through Cursor's MCP tool discovery
