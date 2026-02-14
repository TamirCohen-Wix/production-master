---
description: "Analyze recent investigations and suggest improvements to domain config and memory"
user-invocable: true
---

# Update Context — Post-Investigation Improvement

You analyze recent investigation outputs and suggest improvements to the production-master repository's domain config and memory files.

## Process

### Step 1: Find Recent Investigations

Search for debug directories:
```bash
find . ~/.claude -maxdepth 3 -type d -name "debug-*" -mtime -30 2>/dev/null | sort -r | head -10
```

For each directory found, read:
- `findings-summary.md` — investigation state and key findings
- `report.md` — final investigation report (if exists)

### Step 2: Extract Patterns

From the investigation reports, identify:

1. **New services** — artifact_ids that appeared in investigations but aren't in `domain.json`
2. **New error patterns** — recurring errors worth documenting in MEMORY.md
3. **New Slack channels** — channels referenced in investigations
4. **Updated artifact mappings** — corrections to artifact_id patterns
5. **Investigation shortcuts** — common queries or patterns that would speed up future investigations

### Step 3: Check Current Domain Config

Read `.claude/domain.json` (or the domain.json from the production-master repo).

Compare with patterns found in Step 2:
- Are all discovered services listed in `primary_services`?
- Are Slack channels up to date?
- Is the artifact_prefix still accurate?

### Step 4: Check Current Memory

Read `.claude/memory/MEMORY.md` (or the project-scoped MEMORY.md).

Identify knowledge gaps:
- Are there error patterns from investigations not documented?
- Are there debugging shortcuts not captured?
- Are there service interaction patterns not recorded?

### Step 5: Generate Diff

Present the suggested changes as a diff:

```
=== Suggested Updates ===

--- domain.json
+++ domain.json (updated)
  "primary_services": [
    ... existing ...
+   {"name": "new-service", "artifact_id": "com.wixpress.bookings.new-service"}
  ]

--- memory/MEMORY.md
+++ memory/MEMORY.md (updated)
+ ### New Pattern: [Pattern Name]
+ - [Description from investigation findings]
```

### Step 6: Apply or PR

Ask the user:
1. **Apply locally** — Update the files in place
2. **Open PR** — Clone/update production-master repo and open a PR with changes
3. **Skip** — Show the suggestions but don't apply

If "Open PR":
1. Check if production-master is cloned locally
2. If not, clone it to a temp directory
3. Create a branch: `update-context/YYYY-MM-DD`
4. Apply changes to the appropriate Domain/ files
5. Commit and push
6. Open PR with description of what was learned

## Output

```
=== Update Context Summary ===

Investigations analyzed: [N]
Date range: [oldest] to [newest]

### Suggested Changes

#### domain.json
- [+] Add service: [name] ([artifact_id])
- [~] Update channel: [old] → [new]

#### memory/MEMORY.md
- [+] New pattern: [description]
- [+] New debugging shortcut: [description]

### Action
[Applied locally / PR opened: URL / Skipped]
```
