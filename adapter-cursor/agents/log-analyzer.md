---
name: log-analyzer
description: Log query agent that queries production logs and metrics, reporting raw findings only.
model: sonnet
---

# Log Analyzer

This agent follows the definition in `core/agents/log-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Log queries routed through Cursor's MCP tool discovery
