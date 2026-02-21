# Production Master — Cursor IDE Adapter

Cursor IDE surface for the Production Master autonomous investigation pipeline.

## Setup

1. Set the `PRODUCTION_MASTER_ACCESS_KEY` environment variable with your personal key from <https://mcp-s-connect.wewix.net/mcp-servers>.

2. Open this directory in Cursor IDE. The `.mcp.json` and `.cursor-plugin/plugin.json` files will be picked up automatically.

## Structure

| Directory | Purpose |
|-----------|---------|
| `.cursor-plugin/` | Cursor plugin manifest (`plugin.json`) |
| `rules/` | Cursor-specific rule files |
| `commands/` | Cursor command definitions |
| `agents/` | Cursor agent configurations |
| `hooks/` | Lifecycle hooks |
| `scripts/` | Utility scripts |
| `skills/` | **Symlink** to `../core/skills/` — shared skill definitions |
| `tests/` | Adapter-specific tests |

## Shared Engine

All core logic (agents, skills, output styles, orchestrator) lives in `core/`. This adapter provides the Cursor IDE integration layer on top of the shared engine.

The `skills/` directory is a symlink to `core/skills/` so that skill definitions are always in sync across adapters.

The command set includes `production-master-feedback.md` to submit structured post-investigation feedback into the cloud feedback loop.
