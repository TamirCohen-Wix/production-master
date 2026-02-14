# Contributing

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
2. **Edit files** directly (agents, commands, skills, hooks, output-styles, scripts)
3. **Test locally** — run `claude --plugin-dir .` and use `/production-master` on a real ticket
4. **Open a PR** with what you changed and why

### What You Can Improve

- **Agents** (`agents/`) — Improve agent prompts, add validation steps, tune quality gates
- **Commands** (`commands/`) — Add new commands or improve existing flows
- **Skills** (`skills/`) — Update MCP tool documentation as APIs change
- **Hooks** (`hooks/`) — Add validation or notification hooks
- **Output styles** (`output-styles/`) — Improve report formatting
- **Domain configs** (`Domain/`) — Add or update team-specific configurations

## Guidelines

- **Don't hardcode company-specific values** in pipeline files — use `domain.json` for anything repo-specific
- **Keep agents focused** — each agent has one job. Don't add analysis to data-collection agents
- **Test with real tickets** — the best way to validate changes
- **Update MEMORY.md** — if you learn something from an investigation, capture it
- **Preserve data isolation** — data agents must never see each other's outputs
- **Follow model tiering** — all subagents use Sonnet
