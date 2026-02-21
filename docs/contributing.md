# Contributing

## Surface-Aware Contributions

Production Master has three surfaces sharing one core runtime:

- Claude (`adapter-claude/`)
- Cursor (`adapter-cursor/`)
- Cloud (`adapter-cloud/`)

When possible, implement behavior in `core/` first, then keep adapter changes minimal and surface-specific.

## Contributing a New Domain

The easiest way — use `/update-context`:

1. Install Production Master
2. Run `/update-context` from your repo in Claude Code — it guides you through creating domain config interactively
3. Say "yes" when it asks to open a PR
4. The PR lands in `Domain/<Division>/<Side>/<repo>/`

### Manual Domain Creation

If you prefer to create domain configs manually:

1. Create a directory: `Domain/<Division>/<Side>/<repo>/`
2. Add `domain.json` with your service configuration (see [architecture.md](architecture.md) for field reference)
3. Add `CLAUDE.md` with repo-specific instructions
4. Add `memory/MEMORY.md` with a skeleton template
5. Open a PR

## Contributing Pipeline Improvements

1. **Fork & clone** this repo
2. **Edit files** in the right layer (`core/` for shared behavior, adapter dirs for integration points)
3. **Test locally** on the surface you changed (`adapter-claude/`, `adapter-cursor/`, or `adapter-cloud/`)
4. **Open a PR** with what you changed and why

### What You Can Improve

- **Core agents** (`core/agents/`) — Improve prompts, validation steps, and quality gates
- **Core skills** (`core/skills/`) — Update MCP/tool guidance as APIs change
- **Core output styles** (`core/output-styles/`) — Improve report formatting
- **Claude integration** (`adapter-claude/commands/`, `adapter-claude/hooks/`, `adapter-claude/scripts/`)
- **Cursor integration** (`adapter-cursor/`)
- **Cloud integration** (`adapter-cloud/`)
- **Domain configs** (`Domain/`) — Add or update team-specific configurations

## Guidelines

- **Don't hardcode company-specific values** in pipeline files — use `domain.json` for anything repo-specific
- **Keep agents focused** — each agent has one job. Don't add analysis to data-collection agents
- **Test on affected surfaces** — the best way to validate behavior and adapter parity
- **Update MEMORY.md** — if you learn something from an investigation, capture it
- **Preserve data isolation** — data agents must never see each other's outputs
- **Follow model tiering** — use lightweight models for structured tasks, stronger models for reasoning-heavy tasks
