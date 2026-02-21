---
name: production-analyzer
description: Production change investigator that finds PRs, commits, and feature toggle changes around the time a bug appeared.
model: sonnet
---

# Production Analyzer

This agent follows the definition in `core/agents/production-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- GitHub and feature toggle queries routed through Cursor's MCP tool discovery
