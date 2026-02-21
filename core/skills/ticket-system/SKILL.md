---
description: "Ticket System — Abstract Capability Skill Reference"
user-invocable: false
capability: ticket-system
provider: abstract
---

# Ticket System — Capability Skill Reference

Abstract capability contract for issue tracking and ticket management.

This skill defines normalized operations. Concrete providers (for example `jira`) map their API specifics to this interface.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Read one ticket with full context | `get_ticket` |
| Discover related tickets | `search_tickets` |
| Add investigation findings/progress | `add_comment` |
| Move ticket to new workflow state | `update_status` |

---

## Operations

### get_ticket

Retrieve a single ticket by its identifier.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_id` | string | Yes | Unique ticket identifier (e.g., SCHED-45895) |
| `fields` | string[] | No | Optional list of fields to return |

**Returns:** `{ ticket_id, summary, description, status, priority, assignee, reporter, created, updated, comments: [{ author, body, created }] }`

---

### search_tickets

Search for tickets matching query criteria.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query string |
| `project` | string | No | Project key to scope the search |
| `max_results` | integer | No | Maximum number of results to return |

**Returns:** `{ tickets: [{ ticket_id, summary, status, priority, assignee }], total: number }`

---

### add_comment

Add a comment to an existing ticket.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_id` | string | Yes | Ticket to comment on |
| `comment` | string | Yes | Comment body text |

**Returns:** `{ comment_id, created }`

---

### update_status

Transition a ticket to a new status.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ticket_id` | string | Yes | Ticket to update |
| `status` | string | Yes | Target status name or ID |
| `comment` | string | No | Optional comment to add with the transition |

**Returns:** `{ ticket_id, previous_status, new_status }`

---

## Recommended Workflow

1. Load source ticket with `get_ticket`.
2. Expand incident context via `search_tickets` (duplicates, regressions, linked issues).
3. Post progress checkpoints with `add_comment`.
4. Transition state with `update_status` only when entry/exit criteria are met.

---

## Guardrails

- Preserve original incident details; avoid rewriting history in comments.
- Keep comments evidence-first and time-stamped.
- Do not transition status without clear rationale.
- Include links to PRs/reports when updating tickets.

---

## Common Failure Modes

- Moving status before evidence is complete.
- Overwriting concise ticket narrative with noisy updates.
- Failing to correlate with previous similar issues.
