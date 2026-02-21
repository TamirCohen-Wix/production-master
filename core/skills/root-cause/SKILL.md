---
description: "Root Cause — MCP Skill Reference"
user-invocable: false
capability: root-cause-orchestration
provider: root-cause
---

# Root Cause — MCP Skill Reference

Server name: `root-cause`

This server provides asynchronous root-cause analysis orchestration. It has **2 tools**.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| Start an async RCA run | `start_root_cause_analysis` |
| Poll/wait for RCA completion | `await_root_cause_analysis` |

---

## Workflow

1. Trigger with `start_root_cause_analysis`
2. Persist returned identifier/job metadata
3. Collect final result with `await_root_cause_analysis`
4. Treat output as evidence input for verifier, not as final truth

---

## Guardrails

- Never block indefinitely; use bounded polling with clear timeout.
- Preserve all request parameters and correlation IDs.
- Treat RCA output as one evidence source among others.
- If RCA output conflicts with logs/code/timeline, escalate discrepancy.

---

## Common Failure Modes

- Starting analysis without enough context, producing weak output.
- Losing job identifier and being unable to await completion.
- Treating RCA summary as proof without cross-validation.

---

## When to Use

- When hypothesis testing needs longer-running multi-source RCA
- When synchronous per-tool querying is too slow for broad correlation
- As an augmentation to, not replacement for, direct evidence gathering
