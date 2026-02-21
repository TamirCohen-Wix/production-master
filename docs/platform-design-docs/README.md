# Platform Design Docs Index

These documents capture architecture decisions, implementation plans, and gap analysis for Production Master.

## Reading order

1. [00-overview-shared-architecture.md](00-overview-shared-architecture.md) — Core architecture, monorepo strategy, and shared model.
2. [01-claude-code-plugin.md](01-claude-code-plugin.md) — Claude adapter design and plugin behavior.
3. [02-cursor-plugin.md](02-cursor-plugin.md) — Cursor adapter design and integration details.
4. [03-cloud-pipeline.md](03-cloud-pipeline.md) — Cloud service architecture and pipeline runtime model.
5. [04-implementation-plan.md](04-implementation-plan.md) — Execution plan, milestones, and work breakdown.
6. [05-capability-abstraction-layer.md](05-capability-abstraction-layer.md) — Capability-based MCP abstraction strategy.
7. [06-pr-plan.md](06-pr-plan.md) — PR-by-PR delivery plan.
8. [07-gaps-and-enhancements.md](07-gaps-and-enhancements.md) — Gap inventory and follow-up enhancements.

## Notes

- These documents are design-time artifacts and can include historical assumptions.
- For current runtime behavior, prefer the canonical docs in [`docs/`](../README.md) and adapter READMEs.
