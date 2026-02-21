# Custom MCPs

Local MCP adapters and mocks used by Production Master to support capability-based abstraction.

## Included

- `log-system/` — capability-level scaffold that exposes `query_logs` and `query_metrics`.

## Purpose

- Decouple agent prompts from vendor-specific APIs.
- Provide a stable capability contract while providers evolve.
- Enable testing with deterministic mock/scaffold responses.
