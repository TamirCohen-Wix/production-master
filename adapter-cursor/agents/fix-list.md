---
name: fix-list
description: Senior engineer that creates actionable fix plans from confirmed hypotheses. Queries feature toggles for rollback options.
model: sonnet
---

# Fix List

This agent follows the definition in `core/agents/fix-list.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Feature toggle queries routed through Cursor's MCP tool discovery
