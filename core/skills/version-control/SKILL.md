---
description: "Version Control — Abstract Capability Skill Reference"
user-invocable: false
capability: version-control
provider: abstract
---

# Version Control — Capability Skill Reference

Abstract capability contract for git hosting with commit history, pull requests, diffs, and branch management. This skill file defines the normalized tool interface — the actual MCP server translates to the active provider (GitHub, GitLab, Bitbucket, etc.).

---

## Tools

### list_commits

List commits on a branch with optional filters.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `branch` | string | No | Branch name or SHA |
| `since` | string (ISO 8601) | No | Only commits after this date |
| `until` | string (ISO 8601) | No | Only commits before this date |
| `limit` | integer | No | Maximum number of commits |

**Returns:** `{ commits: [{ sha, message, author, date, files_changed }] }`

---

### list_prs

List pull requests with optional state and sort filters.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `state` | enum: open, closed, all | No | PR state filter |
| `sort` | enum: created, updated, popularity | No | Sort order |
| `limit` | integer | No | Maximum number of PRs |

**Returns:** `{ pull_requests: [{ number, title, state, author, created, merged }] }`

---

### get_diff

Get the diff between two refs (branches, tags, commits).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `base` | string | Yes | Base ref (branch, tag, or SHA) |
| `head` | string | Yes | Head ref to compare |

**Returns:** `{ files: [{ filename, status, additions, deletions, patch }], total_commits: number }`

---

### get_pr_details

Get full details of a specific pull request.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | Repository owner |
| `repo` | string | Yes | Repository name |
| `pr_number` | integer | Yes | Pull request number |

**Returns:** `{ number, title, body, state, author, created, merged, merge_commit, files_changed, additions, deletions }`
