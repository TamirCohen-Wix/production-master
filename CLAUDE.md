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

## Git/Worktree Hygiene (Required)

To avoid branch cleanup failures and stale worktrees, follow this policy for every task:

- **One PR = one branch = one worktree**.
- **Do not reuse old worktrees** across PRs.
- **Close in this order after merge**:
  1. verify PR merged to `main`,
  2. remove worktree,
  3. delete local branch,
  4. prune/fetch remote refs.
- **Never delete a branch before removing its worktree** (Git will block it).
- Keep only actively worked branches locally; delete merged feature branches promptly.

### Merge strategy (repo expectation)

- Squash merge only.
- Auto-delete branch on merge enabled.

If these settings drift, fix repo settings before starting a new PR wave.
