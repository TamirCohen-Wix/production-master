# Custom MCPs

Local MCP servers that expose abstract capability-level tool names, decoupling agent prompts from vendor-specific APIs.

Each server is a translation layer: it accepts capability-level parameters (defined in `core/capabilities/interfaces/`), and delegates to the upstream vendor MCP server. The initial implementation returns scaffold responses matching the interface schema — upstream delegation is added when MCP-to-MCP forwarding is wired.

## Servers

| Server | Dir | Tools | Upstream Provider | Interface Schema |
|--------|-----|-------|-------------------|------------------|
| `log-system` | `log-system/` | `query_logs`, `query_metrics`, `get_error_details`, `trace_request`, `list_services` | grafana-datasource | `core/capabilities/interfaces/log-system.json` |
| `ticket-system` | `ticket-system/` | `get_ticket`, `search_tickets`, `add_comment`, `update_status` | jira | `core/capabilities/interfaces/ticket-system.json` |
| `code-search` | `code-search/` | `search_code`, `get_file`, `search_symbols` | octocode | `core/capabilities/interfaces/code-search.json` |
| `team-comms` | `team-comms/` | `search_messages`, `get_thread`, `post_message`, `find_channel` | slack | `core/capabilities/interfaces/team-communications.json` |
| `version-control` | `version-control/` | `list_commits`, `list_prs`, `get_diff`, `get_pr_details` | github | `core/capabilities/interfaces/version-control.json` |
| `feature-flags` | `feature-flags/` | `get_flag`, `list_flags`, `get_rollout_history` | ft-release | `core/capabilities/interfaces/feature-flags.json` |

## Per-server structure

```
custom-mcps/{name}/
  package.json      # Dependencies: @modelcontextprotocol/sdk, zod
  tsconfig.json     # ES2022, NodeNext, strict
  src/
    index.ts        # MCP server + tool registrations
```

## Build

```bash
cd custom-mcps/{name}
npm install
npm run build
```

## Purpose

- Decouple agent prompts from vendor-specific APIs
- Provide a stable capability contract while providers evolve
- Enable testing with deterministic scaffold responses
- Support provider swapping (e.g., Grafana → Datadog) without changing agent prompts

## Configuration

- Keep capability names stable (`query_logs`, `search_code`, etc.) across providers
- Map provider-specific tool names in the server layer, not in agent prompts
- Wire custom MCP servers into your MCP config when ready for runtime use
