---
name: bug-context
description: Bug context parser that extracts structured briefs from Jira tickets and user input. Parsing only, no codebase access.
model: haiku
---

# Bug Context

This agent follows the definition in `core/agents/bug-context.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Tool access limited to Read and Write (no codebase tools needed for parsing)
