# Production Master Report — Submit Feedback via GitHub Issue (Cursor Adapter)

You help users submit feedback about Production Master to the `TamirCohen-Wix/production-master` GitHub repository. You support 3 issue types: **bug reports**, **enhancements**, and **questions**.

---

## Process

### Step 1: Classify intent

Parse `$ARGUMENTS` to determine the issue type:

| Type | Triggers | Label |
|------|----------|-------|
| `bug` | "bug", "broken", "fails", "error", "crash", "timeout", "wrong", "not working", starts with a problem description | `bug` |
| `enhancement` | "enhancement", "feature", "improve", "add support", "would be nice", "suggestion" | `enhancement` |
| `question` | "question", "how do I", "what is", "help with", "can I", "does it" | `question` |

If ambiguous, ask the user which type they intended.

Strip the type keyword from the remaining text -- this becomes `USER_DESCRIPTION`.

### Step 2: Collect environment info

Gather the following (silently, don't show to user yet):

```bash
# Plugin version
cat ~/Projects/production-master/VERSION 2>/dev/null || echo "unknown"

# OS info
uname -s -r -m

# Domain config (if loaded in current repo)
REPO_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null)
ls ~/.cursor/production-master/domains/${REPO_NAME}/domain.json 2>/dev/null
```

Store as `PLUGIN_VERSION`, `OS_INFO`, `DOMAIN_CONFIG`.

---

## Bug Report Flow

### Step 3a: Locate debug directory

Find the most recent debug directory:
```bash
ls -dt .cursor/debug/debug-* 2>/dev/null | head -1
```
If not found, try:
```bash
ls -dt ~/.cursor/debug/debug-* debug/debug-* 2>/dev/null | head -1
```
Store as `DEBUG_DIR`. If not found, note this -- the bug report will proceed without trace data.

### Step 4a: Read debug artifacts

If `DEBUG_DIR` exists, read ALL files:
- All `*-trace-V*.md` files (execution traces)
- All `*-output-V*.md` files (phase outputs)
- `findings-summary.md` (pipeline state)
- `report.md` (final report, if exists)

Analyze the traces to extract:
1. **Pipeline run summary** — which phases ran, which completed, which failed
2. **Hypothesis iterations** — how many loops, what was tried
3. **MCP failures** — any tool calls that failed, timed out, or returned errors
4. **Phase errors** — phases that produced empty or malformed output
5. **Quality gate failures** — verifier rejections, confidence scores

### Step 5a: Build the issue body

Compose the GitHub issue using this template:

```markdown
## Bug Report

### Description
{USER_DESCRIPTION}

### Pipeline Run Context
- **Debug directory:** `{DEBUG_DIR name, not full path}`
- **Phases that ran:** {list from trace files}
- **Phases that failed/errored:** {list, or "none"}
- **Hypothesis iterations:** {count}
- **Final confidence score:** {score, if available}

### Relevant Trace Excerpts

#### MCP Failures
{Any MCP tool failures from traces -- tool name, error message, timestamp}

#### Phase Errors
{Any phase errors -- phase name, error type, brief excerpt}

#### Quality Gate Issues
{Any verifier rejections -- reason, confidence score}

### Environment
- **Plugin version:** {PLUGIN_VERSION}
- **OS:** {OS_INFO}
- **Domain config:** {DOMAIN_CONFIG path or "none"}
- **MCP servers:** {list which servers were checked, pass/fail status}

### Debug Files
<details>
<summary>Findings Summary</summary>

{contents of findings-summary.md, if exists}
</details>
```

If no `DEBUG_DIR` was found, use a simpler template without trace data.

### Step 6a: Proceed to Step 8 (Review Gate)

---

## Enhancement Flow

### Step 3b: Ask for details (if needed)

If `USER_DESCRIPTION` is short (fewer than 10 words), ask for current behavior, desired behavior, and use case.

### Step 4b: Check for debug context

If a recent debug directory exists, ask the user if they want to reference it for context.

### Step 5b: Build the issue body

```markdown
## Enhancement Request

### Description
{USER_DESCRIPTION}

### Current Behavior
{What currently happens}

### Desired Behavior
{What the user wants instead}

### Use Case
{Why this matters}

### Environment
- **Plugin version:** {PLUGIN_VERSION}
- **OS:** {OS_INFO}
- **Domain config:** {DOMAIN_CONFIG path or "none"}
```

### Step 6b: Proceed to Step 8 (Review Gate)

---

## Question Flow

### Step 3c: Build the issue body

```markdown
## Question

{USER_DESCRIPTION}

### Environment
- **Plugin version:** {PLUGIN_VERSION}
- **OS:** {OS_INFO}
- **Domain config:** {DOMAIN_CONFIG path or "none"}
```

### Step 4c: Proceed to Step 8 (Review Gate)

---

## Step 8: Review Gate (ALL issue types)

**This step is mandatory.** Show the user the complete draft:

```
I've prepared the following GitHub issue for TamirCohen-Wix/production-master:

**Type:** {bug/enhancement/question}
**Title:** {generated title}
**Labels:** {label}

---
{full issue body}
---

Would you like me to submit this, or would you like to make changes first?
```

Wait for explicit user approval before proceeding. If the user wants changes, apply them and show the draft again.

## Step 9: Submit

Create the issue via `gh`:

```bash
gh issue create \
  --repo TamirCohen-Wix/production-master \
  --title "{TITLE}" \
  --label "{LABEL}" \
  --body "{ISSUE_BODY}"
```

Show the user the issue URL and confirm submission.
