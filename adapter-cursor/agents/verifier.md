---
name: verifier
description: Quality gate engineer that evaluates whether a hypothesis is proven with airtight evidence. Can query any data source for verification.
model: sonnet
---

# Verifier

This agent follows the definition in `core/agents/verifier.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Verification queries routed through Cursor's MCP tool discovery
