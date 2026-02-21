# Production Master Documentation Style Guide

Use this guide for all Markdown docs in this repository.

## Audience-first writing

- Start each README with who it is for and what problem it solves.
- Keep the first screen focused on outcomes, not internals.
- Put deep implementation detail in linked docs, not intro sections.

## Section templates

## README template (root and adapters)

1. Title and one-line summary
2. Who this is for
3. Quick start
4. Install and setup
5. Usage examples
6. Configuration
7. Troubleshooting
8. Contributing links

## Reference doc template (`docs/*.md`)

1. Scope and purpose
2. Canonical concepts or interfaces
3. Task guidance or examples
4. Related docs and next steps

## Links and paths

- Prefer descriptive link text. Good: `[cloud deployment guide](adapter-cloud/README.md)`.
- Avoid raw path text as primary anchor text. Avoid: `[adapter-cloud/README.md](adapter-cloud/README.md)`.
- In repository root docs, use `docs/...` and `adapter-.../...` paths.
- Inside a docs subfolder, prefer `./...` for sibling files and `../...` when leaving the folder.

## Diagram rules

- A doc should have one canonical diagram per concept.
- Root `README.md` may include a high-level architecture diagram, but only after Quick Start.
- Deep process diagrams belong in `docs/architecture.md` and `docs/investigation-flow.md`.
- If a diagram duplicates another document, replace with a short summary and link to the canonical source.

## Consistency rules

- Use sentence case headings unless a proper noun requires title case.
- Use em dash (`—`) for parenthetical breaks in prose.
- Keep terminology consistent: "adapter", "shared core", "investigation pipeline", "MCP server".
- Keep examples runnable and close to real workflows.

## Maintenance checklist

- Verify links after doc changes.
- Remove stale counts, version claims, and duplicated tables.
- Keep design-time assumptions in `docs/platform-design-docs/`; keep runtime behavior in `docs/` and adapter READMEs.
