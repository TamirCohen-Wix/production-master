---
description: "Version Control — Abstract Capability Skill Reference"
user-invocable: false
capability: version-control
provider: abstract
---

# Version Control — Capability Skill Reference

Abstract capability contract for git hosting with commit history, pull requests, diffs, and branch management.

This skill defines normalized operations. Concrete providers (for example `github`) map tool names and payload shapes to this interface.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Identify code changes by time/branch | `list_commits` |
| See candidate PRs around incident | `list_prs` |
| Understand exact code delta | `get_diff` |
| Inspect one PR in depth | `get_pr_details` |

---

## Operations

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

---

## Investigation Workflow

1. Collect incident window and affected repos.
2. Use `list_commits` and `list_prs` to build change timeline.
3. Use `get_pr_details` for top candidates.
4. Use `get_diff` to validate whether code touched the failing path.

---

## Guardrails

- Correlation is not causation. Require code-path relevance, not only timing.
- Include timezone normalization for all timeline analysis.
- Track both merged and deployed context where possible.
- Capture authorship/ownership for follow-up actions.

---

## Common Failure Modes

- Looking only at latest commits instead of incident window.
- Ignoring transitive repos/services in the flow.
- Treating PR title as proof without diff inspection.
