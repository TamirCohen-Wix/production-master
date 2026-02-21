---
name: grafana-analyzer
description: Grafana log query agent that queries production logs and metrics, reporting raw findings only.
model: sonnet
---

# Grafana Analyzer

This agent follows the definition in `core/agents/grafana-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Grafana queries routed through Cursor's MCP tool discovery
