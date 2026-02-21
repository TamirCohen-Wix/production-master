# Production Master — Claude Code Adapter

> **Sibling adapters:** [Cursor](../adapter-cursor/README.md) | [Cloud](../adapter-cloud/README.md)

This adapter connects the shared Production Master engine to Claude Code (commands, hooks, and runtime wiring).

## Who this is for

Use this adapter if you want to run Production Master investigations directly from Claude Code with slash commands.

## Quick start

From the repository root:

```bash
bash adapter-claude/scripts/install.sh
```

Then run:

```text
/production-master SCHED-45895
```

## Install and setup

1. Install with `bash adapter-claude/scripts/install.sh`.
2. Choose install scope (`local`, `project`, or `user`) when prompted.
3. Provide your MCP access key when prompted.
4. Validate setup with `bash adapter-claude/scripts/validate-install.sh`.

For a no-install trial session:

```bash
claude --plugin-dir ./production-master
```

## Usage examples

```text
/production-master SCHED-45895
/production-master get errors from bookings-service last 2h
/production-master check toggle specs.bookings.SomeToggle
```

## Configuration

- Hooks are defined in `hooks/hooks.json`.
- Scripts live in `scripts/` and are referenced from hook configuration.
- `CLAUDE_PLUGIN_ROOT` must resolve correctly for hook script paths to work.

## Structure

| Directory | Purpose |
|---|---|
| `.claude-plugin/` | Plugin manifest (`plugin.json`) and marketplace listing (`marketplace.json`) |
| `hooks/` | Claude Code hook definitions (`hooks.json`) |
| `scripts/` | Install, validate, release, sync, and status line scripts |
| `commands/` | Slash command definitions, including `production-master-feedback.md` |
| `tests/` | Adapter-level validation scripts |

## Relationship to shared core

Core orchestration, domain logic, output styles, and agent definitions live in [`core/`](../core). This adapter provides the Claude Code integration layer.

## Troubleshooting

- If install succeeds but commands fail, run `bash adapter-claude/scripts/validate-install.sh`.
- If hooks do not execute, verify `CLAUDE_PLUGIN_ROOT` path resolution and `hooks/hooks.json` script paths.
- For MCP connectivity failures, check [#mcp-gw-support](https://wix.slack.com/archives/C093RAT0NLS).

## Contributing

See the repository [contributing guide](../docs/contributing.md) and [documentation index](../docs/README.md) for contribution workflow and standards.
