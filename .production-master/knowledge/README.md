# Production Master Knowledge Registry

Structured knowledge used by the investigation pipeline.

## Layout

- `known-issues/` — service-specific known incident patterns.
- `patterns/` — service-level investigation hints and likely causes.
- `service-graph.yaml` — dependency graph for cross-repo / cross-service traversal.

## Provenance

Every entry should include:

- `source`: `human-verified` or `agent-generated`
- `confidence`: `low|medium|high`
- `last_verified`: date

Agent-generated entries should be treated as provisional until human review.
