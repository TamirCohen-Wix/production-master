---
description: "Docs Schema — MCP Skill Reference"
user-invocable: false
capability: internal-docs-schema
provider: docs-schema
---

# Docs Schema — MCP Skill Reference

Server name: `docs-schema`

This server provides internal documentation and service contract/schema lookup. It has **6 tools**.

Use it when you need authoritative internal contract knowledge (FQDN, service mapping, schema details) before inferring behavior from code only.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| Search internal docs by topic | `search_docs` |
| Resolve FQDN to service context | `fqdn_lookup` |
| Get FQDN details | `fqdn_info` |
| Get FQDN service mapping | `fqdn_service` |
| Get FQDN schema details | `fqdn_schema` |
| Find relevant client library docs | `client_lib` |

---

## Tool Families

- **Discovery:** `search_docs`
- **Identity Resolution:** `fqdn_lookup`, `fqdn_info`
- **Contract Validation:** `fqdn_service`, `fqdn_schema`
- **Client Guidance:** `client_lib`

---

## Workflow

1. Start with `search_docs` for domain terms and service names
2. Use `fqdn_lookup` to identify the exact target
3. Expand with `fqdn_info` + `fqdn_service` + `fqdn_schema`
4. Validate client integration expectations with `client_lib`

---

## Guardrails

- Resolve exact FQDN/service identity before comparing contracts.
- Prefer schema/contract references over assumptions from old code comments.
- Capture contract version/timestamp where available.
- Treat docs as contract input, then verify runtime evidence separately.

---

## Common Failure Modes

- Mixing similarly named endpoints across services.
- Using stale documentation without checking freshness.
- Treating client docs as server contract authority.

---

## When to Use

- Clarifying API or event contract assumptions
- Determining whether a mismatch is schema drift vs code bug
- Confirming service ownership and interface boundaries
- Disambiguating similarly named endpoints/services
