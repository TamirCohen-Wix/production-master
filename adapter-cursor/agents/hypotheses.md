---
name: hypotheses
description: Senior debugging strategist that produces exactly one hypothesis per invocation. Can query Grafana, Octocode, GitHub, and feature toggles for evidence.
model: sonnet
---

# Hypotheses

This agent follows the definition in `core/agents/hypotheses.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Evidence gathering uses Cursor's MCP tool discovery for all data sources
