# Production Master Documentation

This directory is the documentation hub for the monorepo.

## Start here

- If you are new to Production Master, read the [architecture overview](architecture.md) first.
- If you want to run investigations, use the [commands reference](commands.md) and [investigation flow](investigation-flow.md).
- If you need setup help for a specific surface, use the adapter READMEs in the repository root.

## User and operator docs

| Document | Audience | Purpose |
|---|---|---|
| [architecture.md](architecture.md) | All users | Platform architecture and data flow |
| [commands.md](commands.md) | Operators | Command catalog with usage patterns |
| [investigation-flow.md](investigation-flow.md) | Operators | End-to-end investigation execution flow |
| [agents.md](agents.md) | Engineers | Agent responsibilities and boundaries |
| [domain-configs.md](domain-configs.md) | Engineers | Domain config schema and examples |
| [troubleshooting.md](troubleshooting.md) | Operators | Recovery steps and common failures |
| [contributing.md](contributing.md) | Contributors | Contribution workflow and standards |

## Design and planning docs

- For deep architecture and implementation plans, use the [platform design docs index](platform-design-docs/README.md).

## Research reports

- Background research and comparative analysis live under [`docs/research/`](research/).
- Normalized entrypoints:
  - [wix-deep-research-report.md](research/wix-deep-research-report.md)
  - [general-deep-research-report.md](research/general-deep-research-report.md)
  - [plugins-deep-research-report.md](research/plugins-deep-research-report.md)
- Legacy source reports with spaces in filenames are kept for backwards compatibility.
- Canonical product behavior is defined in architecture and adapter docs.
