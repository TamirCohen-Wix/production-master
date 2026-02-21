# Production Master — Claude Code Adapter

> **Sibling adapters:** [Cursor](../adapter-cursor/README.md) | [Cloud](../adapter-cloud/README.md)

This adapter connects the shared Production Master engine to Claude Code (commands, hooks, and runtime wiring).

## Who this is for

Use this adapter if you want to run Production Master investigations directly from Claude Code with slash commands.

## Prerequisites

- Claude Code CLI installed and available as `claude`
- GitHub CLI installed and authenticated as `gh`
- MCP access key from <https://mcp-s-connect.wewix.net/mcp-servers>

## Quick start

Run this from a terminal:

```bash
gh repo clone TamirCohen-Wix/production-master
cd production-master
bash adapter-claude/scripts/install.sh
claude
```

Then run this inside Claude Code:

```text
/production-master SCHED-45895
```

## Install and setup

1. Clone and enter the repository:
   ```bash
   gh repo clone TamirCohen-Wix/production-master
   cd production-master
   ```
2. Install with `bash adapter-claude/scripts/install.sh`.
3. Choose install scope (`local`, `project`, or `user`) when prompted.
4. Provide your MCP access key when prompted.
5. Validate setup with `bash adapter-claude/scripts/validate-install.sh`.

For a no-install trial session from the same repository:

```bash
claude --plugin-dir .
```

If you launched from outside the repository:

```bash
claude --plugin-dir /absolute/path/to/production-master
```

## First-run checklist

1. Run `/production-master --help`.
2. Run `bash adapter-claude/scripts/validate-install.sh`.
3. Run `/production-master SCHED-45895` (or another test ticket).
4. Confirm outputs are written under `.claude/debug/`.

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
