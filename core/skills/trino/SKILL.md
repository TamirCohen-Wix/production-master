---
description: "Trino — MCP Skill Reference"
user-invocable: false
capability: data-warehouse
provider: trino
---

# Trino — MCP Skill Reference

Server name: `trino`

This server provides warehouse query and metadata analysis via Trino. It has **8 tools**.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| Run SQL against warehouse | `execute_trino_sql_query` |
| Sample rows quickly | `get_sample_data` |
| Inspect table schema | `get_table_schema` |
| Inspect technical metadata | `get_table_technical_metadata` |
| Inspect file-level stats | `get_table_file_stats` |
| Inspect partitions | `get_table_partitions` |
| Estimate cardinality quickly | `get_approx_distinct_values_with_count` |
| Controlled wait in scripted flow | `sleep` |

---

## Tool Families

- **Querying:** `execute_trino_sql_query`
- **Sampling/Profile:** `get_sample_data`, `get_approx_distinct_values_with_count`
- **Metadata:** `get_table_schema`, `get_table_technical_metadata`, `get_table_file_stats`, `get_table_partitions`
- **Utility:** `sleep`

---

## Workflow

1. Start with metadata (`get_table_schema`, `get_table_partitions`)
2. Validate assumptions with `get_sample_data`
3. Run focused query via `execute_trino_sql_query`
4. Use `get_approx_distinct_values_with_count` for fast sanity checks

---

## Guardrails

- Inspect schema/partitions before running expensive queries.
- Keep queries bounded and purpose-specific.
- Use sampling first for shape checks.
- Avoid using `sleep` except controlled orchestration/testing scenarios.

---

## Common Failure Modes

- Running heavy cross-partition queries without partition filters.
- Assuming schema from memory rather than checking metadata.
- Using warehouse output as causal proof without runtime corroboration.

---

## When to Use

- Warehouse-side validation of hypotheses from logs/services
- Detecting partition freshness gaps or data skew
- Checking whether analytics/event pipelines reflect expected production behavior
