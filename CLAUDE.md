# Production Master — Monorepo

## Structure

This is a monorepo with shared core logic and adapter-specific layers:

- **`core/`** — Adapter-agnostic: agents, skills, output-styles, orchestrator, domain config schema
- **`adapter-claude/`** — Claude Code adapter: commands, hooks, install scripts
- **`Domain/`** — User domain configs (per-repo)
- **`docs/`** — User-facing documentation
- **`design-docs/`** — Architecture & design documents

## Key Paths

| What | Path |
|------|------|
| Agents | `core/agents/` |
| Skills | `core/skills/` |
| Output styles | `core/output-styles/` |
| Orchestrator | `core/orchestrator/` |
| Domain schema | `core/domain/` |
| Commands (Claude) | `adapter-claude/commands/` |
| Hooks (Claude) | `adapter-claude/hooks/` |
| Install scripts | `adapter-claude/scripts/` |
| MCP servers | `core/mcp-servers.json` (canonical), `mcp-servers.json` (root symlink/copy) |

## Development

- Core changes go in `core/` and are shared across all adapters.
- Claude-specific changes go in `adapter-claude/`.
- CI runs via `.github/workflows/ci.yml` (root) and `.github/workflows/ci-claude.yml` (adapter).
- Tests: `core/tests/` for core, `adapter-claude/tests/` for adapter.

## Future Adapters

- `adapter-cursor/` — Cursor IDE support (planned)
- `adapter-cloud/` — Cloud/API deployment (planned)
