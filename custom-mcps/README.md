# Custom MCPs

Local MCP adapters and mocks used by Production Master to support capability-based abstraction.

## Who this is for

Use this area if you are developing or testing custom MCP server behavior beyond the default platform-provided servers.

## Quick start

1. Inspect available custom MCP folders in this directory.
2. Wire the MCP server into your local MCP config.
3. Run a simple capability call from your adapter workflow.

## Install and setup

- Add your custom server entry to the relevant MCP config (`.mcp.json`, plugin config, or runtime env).
- Ensure required credentials/environment variables are configured.
- Start the custom MCP server process before running investigation workflows.

## Included

- `log-system/` — capability-level scaffold that exposes `query_logs` and `query_metrics`.

## Usage examples

Typical capability-level calls:

- `query_logs(service, time_range, filters)`
- `query_metrics(service, metric_name, aggregation, window)`

## Purpose

- Decouple agent prompts from vendor-specific APIs.
- Provide a stable capability contract while providers evolve.
- Enable testing with deterministic mock/scaffold responses.

## Configuration

- Keep capability names stable (`query_logs`, `query_metrics`) across providers.
- Map provider-specific tool names in adapter or server layer, not in prompts.
- Document auth and endpoint requirements per custom MCP folder.

## Troubleshooting

- If tools are discovered but fail at runtime, validate credentials and host reachability.
- If capability names mismatch expected contracts, align mappings before prompt changes.
- If behavior drifts from production MCPs, capture fixture-based tests to compare outputs.

## Contributing

When adding a new custom MCP:

1. Document supported capabilities and auth requirements.
2. Add usage examples and limitations in that MCP folder.
3. Update [docs/README.md](../docs/README.md) with a pointer if the MCP is generally useful.
