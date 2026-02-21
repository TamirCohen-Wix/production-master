---
description: "DB Core — MCP Skill Reference"
user-invocable: false
capability: db-ops
provider: db-core
---

# DB Core — MCP Skill Reference

Server name: `db-core`

This server provides operational database diagnostics: schema analysis, process/lag inspection, cluster discovery, and SQL execution. It has **15 tools**.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| Run SQL query | `execute_sql_query` |
| Explain SQL plan | `explain_sql_query` |
| Analyze schema patterns/risks | `get_schema_analysis` |
| List database clusters | `list_clusters` |
| List instances | `list_instances` |
| Resolve logical cluster | `get_logical_cluster` |
| Get cluster recommendation | `get_cluster_recommendation` |
| List DB processes | `list_db_processes` |
| Inspect one DB process | `get_db_process` |
| Check replication lag | `get_replication_lag` |
| List tables in cluster | `list_cluster_tables` |
| List views in cluster | `list_cluster_views` |
| Review schema change history | `list_db_schema_changes` |
| List connection/binding options | `list_bindings` |
| Pre-validate binding before query | `pre_validate_binding` |

---

## Tool Families

- **Discovery/Topology:** `list_clusters`, `list_instances`, `get_logical_cluster`, `get_cluster_recommendation`
- **Runtime Health:** `list_db_processes`, `get_db_process`, `get_replication_lag`
- **Schema/Change Insight:** `list_cluster_tables`, `list_cluster_views`, `list_db_schema_changes`, `get_schema_analysis`
- **Querying:** `pre_validate_binding`, `explain_sql_query`, `execute_sql_query`

---

## Safe Usage Pattern

1. Discover target DB with `list_clusters` and `list_instances`
2. Validate target with `pre_validate_binding`
3. Prefer read-only diagnostics first (`list_*`, `get_*`, `explain_sql_query`)
4. Use `execute_sql_query` with narrow scope and explicit limits

---

## Guardrails

- Validate binding/target before any SQL execution.
- Prefer explain plans before expensive queries.
- Use explicit limits and narrow time/partition filters.
- Keep writes disabled unless explicitly approved by process.

---

## Common Failure Modes

- Running broad SQL without target validation.
- Ignoring replication lag when reading inconsistent data.
- Treating schema snapshots as current without checking recent schema changes.

---

## When to Use

- Suspected schema drift or backward-compatibility breaks
- Latency/regression tied to DB process contention or replication lag
- Need to validate which tables/views changed around incident time
