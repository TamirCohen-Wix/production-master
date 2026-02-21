# Production Master — Monorepo

## Structure

This is a monorepo with shared core logic and adapter-specific layers:

- **`core/`** — Adapter-agnostic: agents, skills, output-styles, orchestrator, domain config schema
- **`adapter-claude/`** — Claude Code adapter: commands, hooks, install scripts
- **`adapter-cursor/`** — Cursor IDE adapter: rules, commands, agents, hooks
- **`adapter-cloud/`** — Cloud adapter: REST API, webhooks, workers (Wix Serverless)
- **`docs/`** — User-facing documentation
- **`docs/platform-design-docs/`** — Architecture & design documents

## Key Paths

| What | Path |
|------|------|
| Agents | `core/agents/` |
| Skills | `core/skills/` |
| Output styles | `core/output-styles/` |
| Orchestrator | `core/orchestrator/` |
| Domain schema | `core/domain/` |
| Domain examples | `core/domain/examples/` |
| Commands (Claude) | `adapter-claude/commands/` |
| Hooks (Claude) | `adapter-claude/hooks/` |
| Install scripts | `adapter-claude/scripts/` |
| Cursor rules | `adapter-cursor/rules/` |
| Cursor commands | `adapter-cursor/commands/` |
| Cloud API | `adapter-cloud/src/api/` |
| Cloud workers | `adapter-cloud/src/workers/` |
| MCP servers | `core/mcp-servers.json` (canonical), `mcp-servers.json` (root symlink/copy) |

## Development

- Core changes go in `core/` and are shared across all adapters.
- Adapter-specific changes go in their respective `adapter-*/` directory.
- CI workflows:
  - `.github/workflows/ci.yml` — Plugin & root-level validation
  - `.github/workflows/ci-claude.yml` — Claude Code adapter
  - `.github/workflows/ci-cursor.yml` — Cursor adapter
  - `.github/workflows/ci-cloud.yml` — Cloud adapter
- Tests: `core/tests/` for core, `adapter-*/tests/` for each adapter.

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

## Delivery Workflow (Required)

For each implementation request, follow this sequence end-to-end:

1. **Open/confirm issue first** with:
   - scoped problem statement,
   - TODO checklist,
   - verification checklist,
   - relevant context/links.
2. **Create PR from a dedicated branch/worktree** that implements the issue scope.
3. **Validate CI is passing** before merge.
4. **Resolve all GitHub review threads/comments** (including Copilot review comments) before merge.
5. **Squash-merge PR** into `main` and clean up branch/worktree per policy above.
6. **Post implementation summary back on the issue** (what changed + validation results).
7. **Check off all issue TODO items**.
8. **Close the issue** only after all checklist items are complete.

### Checklist Discipline

- Treat issue checklists as the source of truth for done/not-done.
- Do not close PR/issue with unresolved review conversations.
- Keep verification evidence explicit in PR/issue comments (tests, CI, important manual checks).
