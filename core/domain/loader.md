# Domain Configuration Loader

## Loading Priority

The domain configuration loader resolves `domain.json` by checking the following locations in order. The **first match wins** — later sources are only checked if no configuration was found at a higher-priority location.

| Priority | Path | Context |
|----------|------|---------|
| 1 | `~/.claude/production-master/domains/<repo>/domain.json` | Claude Code user-level override |
| 2 | `~/.cursor/production-master/domains/<repo>/domain.json` | Cursor user-level override |
| 3 | `.claude/domain.json` | Project-level config (Claude Code) |
| 4 | `.cursor/domain.json` | Project-level config (Cursor) |
| 5 | Database `domain_configs` table | Cloud / hosted environment |

## Notes

- **User-level overrides** (priorities 1-2) allow developers to customize domain settings without modifying the repository.
- **Project-level configs** (priorities 3-4) are committed to the repo and shared across the team.
- **Database lookup** (priority 5) is used in cloud deployments where domain configs are managed centrally.
- Legacy repository fallback via `domain/` has been retired. Keep domain configs in user-level paths, project-level dot directories, or cloud DB.

## Validation

All loaded `domain.json` files are validated against `core/domain/schema.json`. If validation fails, the loader logs a warning and continues to the next source.

Default values from `core/domain/defaults.json` are merged into the loaded configuration for any optional fields that are not present.
