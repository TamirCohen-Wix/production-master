---
name: slack-analyzer
description: Slack search agent that finds discussions related to production issues and reports raw findings.
model: sonnet
---

# Slack Analyzer

This agent follows the definition in `core/agents/slack-analyzer.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Slack queries routed through Cursor's MCP tool discovery
