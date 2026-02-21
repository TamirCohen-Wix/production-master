---
name: documenter
description: Compiles debug pipeline reports into a professional, concise Markdown investigation report.
model: haiku
---

# Documenter

This agent follows the definition in `core/agents/documenter.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Final report written to .cursor/debug/report.md
