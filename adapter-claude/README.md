# Production Master -- Claude Code Adapter

This directory contains all files specific to the **Claude Code** integration
for Production Master. It acts as the adapter layer between the shared engine
in `core/` and the Claude Code plugin runtime.

## Relationship to core/

The shared orchestration engine, domain knowledge, output formatting, and
report templates live in [`core/`](../core). This adapter wires those
capabilities into Claude Code via plugin manifests, lifecycle hooks, and
platform-specific scripts.

## Contents

| Directory | Purpose |
|---|---|
| `.claude-plugin/` | Plugin manifest (`plugin.json`) and marketplace listing (`marketplace.json`) |
| `hooks/` | Claude Code hook definitions (`hooks.json`) -- notification and post-tool-use hooks |
| `scripts/` | Installation, validation, version-bump, and status-line scripts |
| `commands/` | Slash-command definitions, including feedback capture (`production-master-feedback.md`) |
| `tests/` | Adapter-level validation scripts |

## Hook path note

`hooks/hooks.json` references scripts via `${CLAUDE_PLUGIN_ROOT}/scripts/...`.
After the move, `CLAUDE_PLUGIN_ROOT` must resolve to the repository root (or
the adapter root, depending on Claude Code's plugin resolution). If the
variable still points to the repo root, the path will need updating to
`${CLAUDE_PLUGIN_ROOT}/adapter-claude/scripts/...` once the plugin manifest is
reconfigured to use this directory as the plugin root.
