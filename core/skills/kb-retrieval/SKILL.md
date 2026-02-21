---
description: "KB Retrieval — MCP Skill Reference"
user-invocable: false
capability: knowledge-base
provider: kb-retrieval
---

# KB Retrieval — MCP Skill Reference

Server name: `kb-retrieval`

This server provides internal knowledge base discovery, retrieval, and writeback. It has **7 tools**.

Use it to ground hypotheses with prior incidents, known patterns, runbooks, and postmortems before spending cycles on broad code/log searches.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| List all available knowledge bases | `list_knowledge_bases` |
| Inspect KB metadata/configuration | `get_knowledge_base_info` |
| Check corpus size quickly | `get_knowledge_base_entry_count` |
| Retrieve relevant docs for a question | `retrieve_relevant_documents_from_kb` |
| Read one specific document in full | `get_document_from_kb` |
| Export all documents (audit/backfill) | `get_all_documents_from_kb` |
| Write a validated lesson learned | `insert_to_knowledge_base` |

---

## Tool Families

- **Catalog/Health:** `list_knowledge_bases`, `get_knowledge_base_info`, `get_knowledge_base_entry_count`
- **Retrieval:** `retrieve_relevant_documents_from_kb`, `get_document_from_kb`, `get_all_documents_from_kb`
- **Writeback:** `insert_to_knowledge_base`

---

## Primary Workflow

1. Discover target KB with `list_knowledge_bases`
2. Confirm context with `get_knowledge_base_info`
3. Retrieve candidate docs with `retrieve_relevant_documents_from_kb`
4. Expand top hits via `get_document_from_kb`
5. Only after verification, write back with `insert_to_knowledge_base`

---

## Tool Notes

### `retrieve_relevant_documents_from_kb`

Primary retrieval entry point. Use for:
- similar historical incident patterns,
- known mitigations and rollout playbooks,
- domain caveats that are not obvious in source code.

### `insert_to_knowledge_base`

Writeback is powerful and risky. Only insert:
- verified outcomes,
- evidence-backed root-cause notes,
- reusable fix procedures.

Never insert speculative hypotheses or partial findings.

---

## Guardrails

- Confirm KB scope before retrieval to avoid cross-domain noise.
- Prefer semantic retrieval first, full doc fetch second.
- Treat KB content as prior evidence, not current runtime truth.
- Write back only verified findings with clear provenance.

---

## Common Failure Modes

- Overfitting to old incidents that only partially match.
- Inserting unresolved or speculative hypotheses into KB.
- Ignoring KB freshness/coverage when scoring confidence.

---

## When to Use

- Early investigation enrichment (before broad exploration)
- Hypothesis grounding and confidence scoring
- Verification of whether a "new bug" is actually a known recurring pattern
- Post-incident codification of validated learnings
