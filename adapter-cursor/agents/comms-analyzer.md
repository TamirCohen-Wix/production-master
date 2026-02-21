---
name: comms-analyzer
description: Team communications search agent that finds discussions related to production issues and reports raw findings.
model: sonnet
---

# Communications Analyzer

This agent follows the definition in `core/agents/comms-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Communications queries routed through Cursor's MCP tool discovery
