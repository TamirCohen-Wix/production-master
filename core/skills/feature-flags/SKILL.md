---
description: "Feature Flags — Abstract Capability Skill Reference"
user-invocable: false
capability: feature-flags
provider: abstract
---

# Feature Flags — Capability Skill Reference

Abstract capability contract for feature toggle management, rollout control, and release strategies.

This skill defines normalized operations. Concrete providers (for example `ft-release`) map their tool names and payloads to this interface.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Inspect one flag deeply | `get_flag` |
| Discover candidate flags by service/owner | `list_flags` |
| Prove rollout timing relative to incident | `get_rollout_history` |

---

## Operations

### get_flag

Get full details of a specific feature flag.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flag_id` | string | Yes | Feature flag identifier |

**Returns:** `{ flag_id, name, description, status, strategy, rollout_percentage, ownership_tag, created, updated }`

---

### list_flags

Search and list feature flags by name, status, or ownership.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search_text` | string | No | Search term for flag name or description |
| `status` | string | No | Filter by flag status |
| `ownership_tag` | string | No | Filter by ownership tag |
| `limit` | integer | No | Maximum number of results |
| `offset` | integer | No | Pagination offset |

**Returns:** `{ flags: [{ flag_id, name, status, ownership_tag }], total: number }`

---

### get_rollout_history

Get the release/rollout history for a feature flag.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flag_id` | string | Yes | Feature flag identifier |
| `limit` | integer | No | Maximum number of releases to return |

**Returns:** `{ releases: [{ release_id, flag_id, strategy, percentage, created_by, created }] }`

---

## Investigation Workflow

1. Run `list_flags` with service/team terms to find candidates.
2. Use `get_flag` for each candidate to validate ownership, status, and strategy.
3. Use `get_rollout_history` to establish whether behavior changed in the incident window.
4. Compare rollout dates vs merge dates. Rollout timing is usually the behavior change signal.

---

## Guardrails

- Do not assume a merge PR changed behavior if rollout happened earlier.
- Require timeline evidence before attributing impact to a flag.
- Track partial rollouts separately from 100 percent rollout.
- Record who changed what and when for auditability.

---

## Common Failure Modes

- Confusing flag cleanup PRs with actual user-facing behavior changes.
- Ignoring percentage rollout and audience segmentation.
- Using only flag names without checking ownership/context.
