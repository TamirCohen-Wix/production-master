# Production Master — Cursor IDE Adapter

> **Sibling adapters:** [Claude Code](../adapter-claude/README.md) | [Cloud](../adapter-cloud/README.md)

Cursor IDE surface for the Production Master autonomous investigation pipeline. This adapter aims for feature parity with the Claude Code adapter.

## Who this is for

Use this adapter if you want to run Production Master workflows inside Cursor with native commands, rules, and agents.

## Prerequisites

- Cursor IDE installed
- GitHub CLI installed and authenticated as `gh`
- MCP access key from <https://mcp-s-connect.wewix.net/mcp-servers>

## Quick start

Run this from a terminal:

```bash
gh repo clone TamirCohen-Wix/production-master
cd production-master/adapter-cursor
export PRODUCTION_MASTER_ACCESS_KEY="<your-mcp-access-key>"
cursor .
```

Then run this in Cursor chat:

```text
production-master --help
```

## Install and setup

### 1) Clone and open the adapter

```bash
gh repo clone TamirCohen-Wix/production-master
cd production-master/adapter-cursor
cursor .
```

### 2) Set required access key

```bash
export PRODUCTION_MASTER_ACCESS_KEY="<your-mcp-access-key>"
```

Get your key from <https://mcp-s-connect.wewix.net/mcp-servers>.

### 3) Restart Cursor from the same shell

Environment variables are inherited from the process that launches Cursor. If you set the key in terminal, relaunch Cursor from that terminal (or set it permanently in your shell profile).

### 4) Verify setup

- Confirm `adapter-cursor/.mcp.json` is present.
- Confirm `adapter-cursor/.cursor-plugin/plugin.json` is present.
- Open Cursor chat and run:

```text
production-master --help
```

If help output appears and MCP tools are available, setup is complete.

## Usage examples

Use the Production Master command flows from Cursor chat, for example:

```text
production-master SCHED-45895
production-master trace 1769611570.535540810122211411840
production-master check toggle specs.bookings.SomeToggle
```

## Configuration

- `PRODUCTION_MASTER_ACCESS_KEY` is required for MCP-backed flows.
- `.mcp.json` defines MCP server connections.
- `.cursor-plugin/plugin.json` defines plugin metadata and command registration.

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

## Relationship to shared core

All core logic (agents, skills, output styles, orchestrator) lives in `core/`. This adapter provides the Cursor IDE integration layer on top of the shared engine.

The `skills/` directory is a symlink to `core/skills/` so that skill definitions are always in sync across adapters.

The command set includes `production-master-feedback.md` to submit structured post-investigation feedback into the cloud feedback loop.

## Troubleshooting

- If you see auth or MCP errors, verify `PRODUCTION_MASTER_ACCESS_KEY` is valid and that Cursor was launched after exporting it.
- If commands do not appear, reload Cursor window and confirm plugin manifest paths.
- If MCP tools fail, validate `PRODUCTION_MASTER_ACCESS_KEY` and `.mcp.json` server entries.
- If behavior differs from Claude adapter, compare shared assets under `core/` and symlinked `skills/`.

## Contributing

See [docs/contributing.md](../docs/contributing.md) for contribution workflow and [docs/style-guide.md](../docs/style-guide.md) for docs formatting expectations.
