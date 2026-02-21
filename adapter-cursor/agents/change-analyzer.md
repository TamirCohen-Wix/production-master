---
name: change-analyzer
description: Production change investigator that finds PRs, commits, and feature toggle changes around the time a bug appeared.
model: sonnet
---

# Change Analyzer

This agent follows the definition in `core/agents/change-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Version control and feature flag queries routed through Cursor's MCP tool discovery
