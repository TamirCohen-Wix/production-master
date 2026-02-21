---
name: codebase-semantics
description: Code archaeologist that maps code flows, error propagation, and service boundaries using Octocode and local repo analysis.
model: sonnet
---

# Codebase Semantics

This agent follows the definition in `core/agents/codebase-semantics.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Leverages Cursor's built-in codebase indexing alongside Octocode MCP
