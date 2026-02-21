---
description: "Code Search — Abstract Capability Skill Reference"
user-invocable: false
capability: code-search
provider: abstract
---

# Code Search — Capability Skill Reference

Abstract capability contract for cross-repository code search, file retrieval, and symbol navigation.

This skill defines normalized operations. Concrete providers (for example `octocode`) map their tool names and parameters to this interface.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Find where an error string appears | `search_code` |
| Find which file/path likely owns a concern | `search_code` (`match=path`) |
| Read the implementation in context | `get_file` |
| Locate classes/functions/types by name | `search_symbols` |

---

## Operations

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

---

## Recommended Workflow

1. Start broad with `search_code` using 2-4 keywords from logs/errors.
2. Narrow by repo/extension once likely candidates are found.
3. Use `get_file` to inspect full context around matches.
4. Use `search_symbols` to verify ownership and call graph entry points.

---

## Guardrails

- Prefer a small set of precise keywords over very broad text.
- Use `match=path` to quickly discover ownership directories.
- Always verify with `get_file` before drawing conclusions.
- Treat search hits as leads, not proof.

---

## Common Failure Modes

- Searching with a single generic token (too noisy).
- Skipping file readback after hit discovery.
- Confusing symbol names across similarly named repos/services.
- Assuming top-ranked result is the real execution path.
