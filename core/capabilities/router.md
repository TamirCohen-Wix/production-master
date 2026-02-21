# Capability Router

The capability router resolves abstract capability names to concrete provider skill files at orchestrator runtime.

## Resolution Flow

1. **Read `registry.yaml`** — determine the active provider for each capability
2. **Map capability → skill file** — use the `skill_file` (abstract) or `vendor_skill` (vendor-specific) path
3. **Load skill content** — read the resolved SKILL.md into a variable for agent injection

When `capability_mode: abstract` is set in the domain config, agents receive the abstract skill file. Otherwise, they receive the vendor-specific skill file (current default behavior).

## Mapping Table

| Capability | Active Provider | Abstract Skill | Vendor Skill |
|------------|----------------|----------------|--------------|
| log-system | grafana-datasource | `core/skills/log-system/SKILL.md` | `core/skills/grafana-datasource/SKILL.md` |
| ticket-system | jira | `core/skills/ticket-system/SKILL.md` | `core/skills/jira/SKILL.md` |
| code-search | octocode | `core/skills/code-search/SKILL.md` | `core/skills/octocode/SKILL.md` |
| team-communications | slack | `core/skills/team-comms/SKILL.md` | `core/skills/slack/SKILL.md` |
| version-control | github | `core/skills/version-control/SKILL.md` | `core/skills/github/SKILL.md` |
| feature-flags | ft-release | `core/skills/feature-flags/SKILL.md` | `core/skills/ft-release/SKILL.md` |

## Integration with Orchestrator

At **Step 0.5** (skill file loading), the orchestrator:

1. Reads `core/capabilities/registry.yaml`
2. For each capability needed by the pipeline, resolves the skill file path
3. Loads all skill files into variables (same as today — `GRAFANA_SKILL`, etc.)

The variable names remain backward-compatible:

```
# Vendor mode (current default):
GRAFANA_SKILL      = read("skills/grafana-datasource/SKILL.md")

# Abstract mode (when capability routing is active):
GRAFANA_SKILL      = read("skills/log-system/SKILL.md")
```

The agent prompts don't need to change — they reference `GRAFANA_SKILL_REFERENCE` regardless of which file was loaded.

## Extending to New Providers

To add a new provider (e.g., Datadog for log-system):

1. Create `core/skills/datadog/SKILL.md` with the Datadog-specific tool reference
2. Create `custom-mcps/log-system-datadog/` with the translation server
3. Update `registry.yaml`: set `provider: datadog` under `log-system`
4. The capability router automatically resolves to the new skill file
