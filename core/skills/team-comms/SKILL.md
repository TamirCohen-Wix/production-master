---
description: "Team Communications — Abstract Capability Skill Reference"
user-invocable: false
capability: team-communications
provider: abstract
---

# Team Communications — Capability Skill Reference

Abstract capability contract for team messaging, channel search, and thread-based discussions.

This skill defines normalized operations. Concrete providers (for example `slack`) map real tool names to these operations.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Find historical discussion by keywords | `search_messages` |
| Read complete context on one thread | `get_thread` |
| Publish update to team/channel | `post_message` |
| Resolve channel identity for posting/search | `find_channel` |

---

## Operations

### search_messages

Search messages across channels by keyword and filters.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search keywords |
| `channel` | string | No | Channel name to scope the search |
| `from_user` | string | No | Filter by message author |
| `after` | string (YYYY-MM-DD) | No | Messages after this date |
| `before` | string (YYYY-MM-DD) | No | Messages before this date |

**Returns:** `{ messages: [{ channel_id, channel_name, author, text, timestamp, thread_id }], total: number }`

---

### get_thread

Retrieve all replies in a message thread.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | string | Yes | Channel containing the thread |
| `thread_id` | string | Yes | Thread identifier (root message timestamp) |

**Returns:** `{ messages: [{ author, text, timestamp }] }`

---

### post_message

Post a message to a channel.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | string | Yes | Target channel ID |
| `text` | string | Yes | Message text content |
| `thread_id` | string | No | Optional thread ID to reply to |

**Returns:** `{ message_id, timestamp }`

---

### find_channel

Find a channel by name and return its ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_name` | string | Yes | Channel name to look up |

**Returns:** `{ channel_id, channel_name, is_private, member_count }`

---

## Recommended Workflow

1. Start with `search_messages` using incident keywords, IDs, and service names.
2. For each high-signal hit, fetch full context with `get_thread`.
3. Resolve channel targets with `find_channel` before posting.
4. Use `post_message` for concise, evidence-linked updates.

---

## Guardrails

- Do not rely on a single message; always inspect thread context.
- Keep identifiers exact when searching (request ID, ticket ID, service name).
- Separate signal (facts) from opinions in comms summaries.
- Post updates in the correct incident channel/thread to preserve continuity.

---

## Common Failure Modes

- Reporting conclusions based on one isolated message.
- Missing critical follow-up replies in long threads.
- Posting to wrong channel due to unresolved channel ID.
