---
description: "Code Search — Abstract Capability Skill Reference"
user-invocable: false
capability: code-search
provider: abstract
---

# Code Search — Capability Skill Reference

Abstract capability contract for cross-repository code search, file retrieval, and symbol navigation. This skill file defines the normalized tool interface — the actual MCP server translates to the active provider (Octocode, Sourcegraph, GitHub Code Search, etc.).

---

## Tools

### search_code

Search code across repositories by keywords or patterns.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keywords` | string[] | Yes | Search terms (code identifiers, error messages, etc.) |
| `repo` | string | No | Repository to search in (e.g., owner/repo) |
| `match` | enum: file, path | No | Match against file content or file path |
| `extension` | string | No | File extension filter (e.g., scala, proto) |
| `limit` | integer | No | Maximum number of results |

**Returns:** `{ results: [{ file_path, repo, matches: [{ line_number, content }] }], total: number }`

---

### get_file

Retrieve the content of a specific file from a repository.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repo` | string | Yes | Repository (e.g., owner/repo) |
| `path` | string | Yes | File path within the repository |
| `branch` | string | No | Branch or ref to read from |
| `match_string` | string | No | Highlight/focus on this string in the file |
| `start_line` | integer | No | Start line for partial content |
| `end_line` | integer | No | End line for partial content |

**Returns:** `{ path, content, language, size_bytes }`

---

### search_symbols

Search for code symbols (classes, functions, types) across repositories.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `symbol` | string | Yes | Symbol name to search for |
| `repo` | string | No | Repository to scope the search |
| `kind` | enum: class, function, interface, type, variable | No | Symbol kind filter |

**Returns:** `{ symbols: [{ name, kind, file_path, line_number, repo }] }`
