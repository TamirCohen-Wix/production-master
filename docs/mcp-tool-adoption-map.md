# MCP Tool Adoption Map (Missed Tools)

This document maps Production Master toolkit tools to:

- where they should be used in the investigation flow,
- which skill files should own them,
- which repo files should be updated.

It focuses on the currently missed tool families from `user-production-master`.

## Current Gap Snapshot

- Toolkit families discovered: `15`
- Families already covered by skill dirs: `9` (`context7`, `fire-console`, `ft-release`, `github`, `grafana-datasource`, `grafana-mcp`, `jira`, `octocode`, `slack`)
- Missing skill dirs for existing toolkit families: `6`
  - `db-core` (15 tools)
  - `devex` (20 tools)
  - `docs-schema` (6 tools)
  - `kb-retrieval` (7 tools)
  - `root-cause` (2 tools)
  - `trino` (8 tools)

## Priority Wave (Start Here)

1. `kb-retrieval` for domain knowledge and incident memory
2. `devex` for ownership/release/build context
3. `docs-schema` for service contract/schema lookup
4. `root-cause` for async RCA workflows
5. `db-core` and `trino` for data validation and deep data checks

## Family-to-Usage Map


| Tool family    | Where to use                                                                                 | Skill file to add/update                                                                                                     | Primary agents                                      |
| -------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `kb-retrieval` | Step 0.4/0.5 enrichment and hypothesis grounding using internal known issues/patterns        | Add `core/skills/kb-retrieval/SKILL.md`; update `core/skills/code-search/SKILL.md` with "when to use KB vs code search"      | `bug-context`, `hypotheses`, `verifier`, `fix-list` |
| `devex`        | Change correlation (build failures, rollout timing, ownership tag drift, where-is-my-commit) | Add `core/skills/devex/SKILL.md`; update `core/skills/github/SKILL.md` cross-reference                                       | `change-analyzer`, `service-resolver`, `verifier`   |
| `docs-schema`  | API/schema truth source, FQDN/service docs lookup before code speculation                    | Add `core/skills/docs-schema/SKILL.md`; update `core/skills/context7/SKILL.md` split (external libs vs internal docs schema) | `codebase-semantics`, `hypotheses`, `verifier`      |
| `root-cause`   | Long-running RCA orchestration (start + await pattern) for async evidence collection         | Add `core/skills/root-cause/SKILL.md`                                                                                        | `hypotheses`, `verifier`                            |
| `db-core`      | DB topology/schema drift/replication/process diagnostics                                     | Add `core/skills/db-core/SKILL.md`                                                                                           | `log-analyzer`, `hypotheses`, `verifier`            |
| `trino`        | Warehouse-level data checks, partition/file/schema validation, sample-based sanity checks    | Add `core/skills/trino/SKILL.md`                                                                                             | `log-analyzer`, `hypotheses`, `verifier`            |


## Tool-Level Usage (Missed Families)

### `kb-retrieval` (7)

- `list_knowledge_bases`: choose KB at investigation start
- `get_knowledge_base_info`: verify scope/ownership/freshness
- `get_knowledge_base_entry_count`: confidence on KB coverage
- `retrieve_relevant_documents_from_kb`: primary retrieval for bug patterns/runbooks
- `get_document_from_kb`: pull full doc when a hit looks relevant
- `get_all_documents_from_kb`: bulk export for periodic quality checks
- `insert_to_knowledge_base`: write back validated lessons learned after closure

### `devex` (20)

- Ownership and routing:
  - `get_service_ownership`, `get_project_ownership`, `code_owners_for_path`, `get_ownership_tag_info`
- Release/build/change timeline:
  - `search_releases`, `release_notes`, `get_rollout_history`, `find_commits_by_date_range`, `where_is_my_commit`
- Build diagnostics:
  - `search_builds`, `get_build`, `get_build_by_external_id`, `why_pr_build_failed_exp`
- Discovery/context:
  - `search_projects`, `get_project`, `get_commit_information`, `available_rcs`, `get_devex_fqdn`, `fleets_pods_overview`, `project_quality_service_get_scores`

### `docs-schema` (6)

- `search_docs`: find internal service documentation
- `fqdn_lookup`, `fqdn_info`, `fqdn_service`, `fqdn_schema`: resolve endpoint/service/schema contract questions
- `client_lib`: identify client library usage and compatibility

### `root-cause` (2)

- `start_root_cause_analysis`: trigger async RCA run for a hypothesis
- `await_root_cause_analysis`: wait/poll and collect final result payload

### `db-core` (15)

- Query and analysis:
  - `execute_sql_query`, `explain_sql_query`, `get_schema_analysis`
- Topology and discovery:
  - `list_clusters`, `list_instances`, `get_logical_cluster`, `get_cluster_recommendation`
- Runtime/health:
  - `list_db_processes`, `get_db_process`, `get_replication_lag`
- Schema/change introspection:
  - `list_cluster_tables`, `list_cluster_views`, `list_db_schema_changes`
- Safety and bindings:
  - `list_bindings`, `pre_validate_binding`

### `trino` (8)

- Direct checks:
  - `execute_trino_sql_query`, `get_sample_data`
- Metadata:
  - `get_table_schema`, `get_table_technical_metadata`, `get_table_file_stats`, `get_table_partitions`
- Fast profiling:
  - `get_approx_distinct_values_with_count`
- Utility:
  - `sleep` (only for controlled flow/testing)

## Files to Update

### 1) New vendor skill files (missing today)

- `core/skills/kb-retrieval/SKILL.md`
- `core/skills/devex/SKILL.md`
- `core/skills/docs-schema/SKILL.md`
- `core/skills/root-cause/SKILL.md`
- `core/skills/db-core/SKILL.md`
- `core/skills/trino/SKILL.md`

### 2) Capability registry/interfaces

- Update `core/capabilities/registry.yaml` with new capabilities and provider mappings
- Add interface schemas:
  - `core/capabilities/interfaces/knowledge-base.json`
  - `core/capabilities/interfaces/internal-docs-schema.json`
  - `core/capabilities/interfaces/devex-intelligence.json`
  - `core/capabilities/interfaces/data-warehouse.json`
  - `core/capabilities/interfaces/db-ops.json`
  - `core/capabilities/interfaces/root-cause-orchestration.json`

### 3) Validation scripts

- Update `core/tests/validate-skills.sh` expected vendor skill directories
- Update `core/tests/validate-capabilities.sh` expected interface list

### 4) Orchestrator docs/wiring

- Update `core/orchestrator/agent-dispatch.md`:
  - capability table,
  - skill injection matrix,
  - Step 0 MCP check expectations
- Update `core/capabilities/router.md` mapping table with new capabilities
- Update `core/orchestrator/recovery-protocol.md` with fallback checks for the new families

### 5) Agent prompt files

- Update skills and tool usage guidance in:
  - `core/agents/change-analyzer.md` (add `devex`)
  - `core/agents/hypotheses.md` (add `kb-retrieval`, `docs-schema`, `root-cause`, `db-core`/`trino` when needed)
  - `core/agents/verifier.md` (same additions as hypotheses)
  - `core/agents/codebase-semantics.md` (add `docs-schema` pre-check guidance)
  - `core/agents/log-analyzer.md` (add `db-core`/`trino` escalation branch)

### 6) User docs that are now stale on counts/scope

- `docs/architecture.md` (skill/server counts)
- `docs/commands.md` (MCP verification step wording)
- `docs/investigation-flow.md` (MCP verification node wording)
- `README.md` and `docs/README.md` (tooling scope and links to capability map)

## Recommended Normalized Capability Names

- `knowledge-base` -> provider `kb-retrieval`
- `internal-docs-schema` -> provider `docs-schema`
- `devex-intelligence` -> provider `devex`
- `db-ops` -> provider `db-core`
- `data-warehouse` -> provider `trino`
- `root-cause-orchestration` -> provider `root-cause`

## Minimum Adoption Plan (Low Risk)

1. Add six vendor skills + validations first (no agent behavior changes yet).
2. Inject `kb-retrieval` into `hypotheses` and `verifier` only.
3. Inject `devex` into `change-analyzer`.
4. Inject `docs-schema` into `codebase-semantics`.
5. Update docs/counts after wiring lands.

