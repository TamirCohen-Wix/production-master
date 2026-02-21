---
description: "DevEx — MCP Skill Reference"
user-invocable: false
capability: devex-intelligence
provider: devex
---

# DevEx — MCP Skill Reference

Server name: `devex`

This server provides engineering intelligence for ownership, builds, releases, rollouts, and project quality. It has **20 tools**.

---

## Tool Decision Matrix

| Need | Tool |
|------|------|
| Find project by name | `search_projects` |
| Get project details | `get_project` |
| Resolve service ownership | `get_service_ownership` |
| Resolve project ownership | `get_project_ownership` |
| Get ownership tag details | `get_ownership_tag_info` |
| Get CODEOWNERS for path | `code_owners_for_path` |
| Search releases | `search_releases` |
| Read release notes | `release_notes` |
| Check rollout history | `get_rollout_history` |
| Search builds | `search_builds` |
| Get build by ID | `get_build` |
| Get build by external ID | `get_build_by_external_id` |
| Explain PR build failure | `why_pr_build_failed_exp` |
| Locate commit deployment path | `where_is_my_commit` |
| List commits by date range | `find_commits_by_date_range` |
| Get commit details | `get_commit_information` |
| Get service/pod fleet overview | `fleets_pods_overview` |
| Get project quality score | `project_quality_service_get_scores` |
| Discover available RCs | `available_rcs` |
| Resolve DevEx FQDN metadata | `get_devex_fqdn` |

---

## Tool Families

- **Ownership:** `get_service_ownership`, `get_project_ownership`, `code_owners_for_path`, `get_ownership_tag_info`
- **Release/Build Timeline:** `search_releases`, `release_notes`, `search_builds`, `get_build`, `get_build_by_external_id`, `why_pr_build_failed_exp`
- **Commit Tracking:** `find_commits_by_date_range`, `get_commit_information`, `where_is_my_commit`
- **Project/Fleet Context:** `search_projects`, `get_project`, `fleets_pods_overview`, `project_quality_service_get_scores`, `available_rcs`, `get_devex_fqdn`

---

## Investigation Workflow

1. Ownership routing: `get_service_ownership` or `code_owners_for_path`
2. Timeline correlation: `search_releases`, `find_commits_by_date_range`, `where_is_my_commit`
3. Build confidence: `search_builds`, `why_pr_build_failed_exp`
4. Rollout confirmation: `get_rollout_history`

---

## Guardrails

- Use ownership tools early to avoid investigation drift.
- Normalize all timeline outputs to one timezone before correlation.
- Prefer exact commit/build identifiers over fuzzy title matching.
- Keep output factual; do not infer root cause in this layer.

---

## Common Failure Modes

- Relying only on PR merge time without deployment verification.
- Missing code-owner context and escalating to wrong team.
- Treating build failure explanations as definitive root cause.

---

## When to Use

- Change analysis around "what changed in prod"
- Deciding which team should own remediation
- Correlating bug start time to release/build timelines
- Validating whether a commit was actually deployed
