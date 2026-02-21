---
description: "Feature Flags — Abstract Capability Skill Reference"
user-invocable: false
capability: feature-flags
provider: abstract
---

# Feature Flags — Capability Skill Reference

Abstract capability contract for feature toggle management, rollout control, and release strategies. This skill file defines the normalized tool interface — the actual MCP server translates to the active provider (FT-release, LaunchDarkly, Split, etc.).

---

## Tools

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
