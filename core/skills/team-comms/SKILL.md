---
description: "Team Communications — Abstract Capability Skill Reference"
user-invocable: false
capability: team-communications
provider: abstract
---

# Team Communications — Capability Skill Reference

Abstract capability contract for team messaging, channel search, and thread-based discussions. This skill file defines the normalized tool interface — the actual MCP server translates to the active provider (Slack, Teams, Discord, etc.).

---

## Tools

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
