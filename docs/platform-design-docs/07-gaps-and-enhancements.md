# 07 — Gaps and Enhancements

> Addressing the strategic principle gaps identified in the 42-principle audit that require dedicated design treatment beyond inline updates to existing documents.

**Source**: Strategic Principles Audit (42 principles × 7 design docs)
**Status**: Draft
**Last Updated**: 2026-02-21
**Implementation Update**:
- Cloud feedback API and meta-analysis worker are implemented.
- Embedding generation and similarity retrieval are implemented in cloud.
- Remaining priorities: structured knowledge lifecycle automation, cross-surface UX parity, and full capability-provider runtime abstraction.

---

## Table of Contents

1. [User Feedback Loop (#17)](#1-user-feedback-loop)
2. [Self-Improvement Agent (#19)](#2-self-improvement-agent)
3. [Domain Knowledge Base (#16)](#3-domain-knowledge-base)
4. [Cross-Repo Investigation (#15)](#4-cross-repo-investigation)
5. [Unknown Unknowns Threat Model (#33)](#5-unknown-unknowns-threat-model)
6. [Autonomous but Controllable (#42)](#6-autonomous-but-controllable)
7. [Enterprise Deployment Research (#26)](#7-enterprise-deployment-research)

---

## 1. User Feedback Loop

**Principle #17**: The system must learn from user feedback to improve investigation quality over time.

### Problem Statement

Currently, investigations are fire-and-forget: the system produces findings but has no mechanism to learn whether those findings were accurate, helpful, or actionable. Without a feedback loop, the system cannot self-correct or improve.

### Design

#### Feedback Command

Each surface provides a feedback entry point:

| Surface | Command | Interface |
|---------|---------|-----------|
| Claude Code | `/production-master-feedback` | CLI prompt: rating + free text |
| Cursor | Sidebar panel | GUI: thumbs up/down + correction fields |
| Cloud | `POST /api/v1/investigations/:id/feedback` | JSON payload |

#### Feedback Data Model

```json
{
  "investigation_id": "inv-20240115-abc",
  "timestamp": "2024-01-15T14:30:00Z",
  "rating": "negative",
  "feedback_type": "false_positive",
  "corrections": [
    {
      "finding_id": "f-003",
      "original": "Memory leak detected in auth-service",
      "correction": "This is expected behavior during cache warmup",
      "confidence": "high"
    }
  ],
  "missed_signals": [
    "The actual root cause was a DNS resolution timeout — check CoreDNS logs"
  ],
  "user_id": "eng-jane-doe"
}
```

#### Ingestion Pipeline

```
User Feedback → Validation → Feedback Store (PostgreSQL)
                                    ↓
                            Feedback Aggregator (daily batch)
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
            MEMORY.md Updates   Domain Knowledge   Prompt Tuning
            (per-service notes) (known-issues DB)  (investigation prompts)
```

#### Feedback → MEMORY.md Flow

1. Aggregator identifies recurring feedback patterns (≥3 similar corrections)
2. Generates a proposed MEMORY.md update (e.g., "auth-service: cache warmup causes transient memory spikes — not a leak")
3. Human review gate: proposed update is surfaced as a PR or notification
4. On approval, MEMORY.md is updated and the feedback entries are marked as "incorporated"

#### Feedback → Domain Knowledge Flow

1. Individual corrections are stored as provisional knowledge (low confidence)
2. When corroborated by ≥2 independent feedback entries, confidence is elevated
3. High-confidence corrections become entries in the Known Issues Registry (see §3)

### Integration Points

- **Doc 00**: User Override Protocol references feedback as a control mechanism
- **Doc 04**: Features C19, U18, P29 implement the surface-specific commands
- **Doc 05**: CAP provides the abstraction layer for feedback storage

### Implementation Priority

**P1** — Feedback collection command (all surfaces)
**P2** — Feedback aggregator and MEMORY.md integration
**P3** — Automated prompt tuning from feedback patterns

---

## 2. Self-Improvement Agent

**Principle #19**: The system should have mechanisms for continuous self-improvement.

### Problem Statement

Even with user feedback, the system lacks an autonomous mechanism to detect patterns in its own performance, identify systematic weaknesses, and propose improvements.

### Design

#### Agent Specification

The Self-Improvement Agent (SIA) is a meta-agent that runs asynchronously after investigation completion:

```
Investigation Complete → Outcome Recorded → SIA Triggered (async)
                                                    ↓
                                            ┌───────┴───────┐
                                            ↓               ↓
                                    Pattern Detection   Outcome Tracking
                                            ↓               ↓
                                    Improvement          Performance
                                    Suggestions          Dashboard
```

#### Post-Investigation Meta-Analysis

For each completed investigation, the SIA:

1. **Compares findings to ground truth** (if available via feedback or incident resolution)
2. **Measures investigation efficiency**: time spent per phase, MCP calls made, tokens consumed
3. **Identifies wasted work**: phases that produced no useful findings, redundant MCP calls
4. **Detects failure patterns**: recurring false positives, consistently missed signals

#### Pattern Detection

The SIA maintains a pattern database:

| Pattern Type | Detection Method | Example |
|-------------|-----------------|---------|
| Recurring false positive | Same finding corrected ≥3 times | "Memory leak in auth-service" always marked false positive |
| Missed signal | User-reported root cause not in findings ≥3 times | DNS issues never detected when CoreDNS is involved |
| Inefficient phase | Phase consistently produces no findings | Slack search for metrics-only incidents |
| Prompt weakness | Low rating correlated with specific prompt sections | Root cause analysis prompt misses infrastructure issues |

#### Prompt Improvement Suggestions

The SIA generates improvement proposals (never auto-applies):

```json
{
  "proposal_id": "sip-2024-015",
  "type": "prompt_improvement",
  "target": "root-cause-analysis-prompt",
  "current_snippet": "Analyze application-level causes...",
  "proposed_snippet": "Analyze both application-level and infrastructure-level causes (DNS, networking, resource limits)...",
  "evidence": ["feedback-001", "feedback-007", "feedback-012"],
  "expected_impact": "Reduce missed infrastructure root causes by ~40%",
  "requires_human_approval": true
}
```

#### Investigation Outcome Tracking

| Metric | Source | Aggregation |
|--------|--------|-------------|
| Accuracy rate | Feedback ratings | 7-day rolling average |
| False positive rate | Feedback corrections | Per-service, per-signal-type |
| Mean investigation time | Investigation traces | Per-intent-mode |
| Cost per investigation | Cost tracking | Per-intent-mode, per-domain |
| User satisfaction | Feedback ratings | Net Promoter Score equivalent |

### Integration Points

- **Doc 00**: Observability framework tracks SIA metrics
- **Doc 03**: Cloud pipeline hosts SIA as an async worker
- **Doc 04**: Feature P30 implements the cloud-side SIA

### Implementation Priority

**P2** — Core SIA with pattern detection
**P3** — Prompt improvement suggestions
**P3** — Automated A/B testing of prompt variants

---

## 3. Domain Knowledge Base

**Principle #16**: The system should accumulate and leverage domain-specific knowledge.

### Problem Statement

MEMORY.md provides a flat, unstructured knowledge store. Production investigation requires structured domain knowledge: known issues per service, recurring failure modes, service-specific patterns, runbook references, and dependency maps.

### Design

#### Structured Known-Issues Registry

```yaml
# .production-master/knowledge/known-issues/auth-service.yaml
service: auth-service
known_issues:
  - id: ki-auth-001
    title: "Cache warmup memory spike"
    pattern:
      metric: "container_memory_usage_bytes{service='auth-service'}"
      condition: "> 80% of limit within 5 minutes of deployment"
    resolution: "Expected behavior. Memory stabilizes within 10 minutes post-deploy."
    confidence: high
    source: human-verified
    last_verified: 2024-01-10
    references:
      - "https://github.com/org/auth-service/issues/234"

  - id: ki-auth-002
    title: "Token refresh storm during certificate rotation"
    pattern:
      log: "token_refresh_failed"
      condition: "> 100 occurrences in 1 minute"
    resolution: "Restart token-refresh workers after cert rotation completes."
    confidence: medium
    source: agent-generated
    last_verified: 2024-01-05
```

#### Service-Specific Patterns

```yaml
# .production-master/knowledge/patterns/auth-service.yaml
service: auth-service
investigation_hints:
  - signal: "5xx spike on /api/auth/token"
    likely_causes:
      - "Redis connection pool exhaustion (check redis_connections_active)"
      - "Certificate expiry (check cert_expiry_seconds)"
      - "Upstream identity provider outage (check idp_health_status)"
    skip_phases: []
    required_phases: ["metrics", "logs"]

  - signal: "Latency increase on /api/auth/verify"
    likely_causes:
      - "JWT verification key rotation in progress"
      - "Database connection pool saturation"
    skip_phases: ["slack"]
    required_phases: ["metrics", "logs", "traces"]
```

#### Recurring Failure Modes

A cross-service registry of failure archetypes:

| Failure Mode | Services Affected | Detection Signal | Typical Root Cause |
|-------------|-------------------|------------------|--------------------|
| Connection pool exhaustion | auth, payments, users | Active connections near limit | Slow downstream dependency |
| Memory leak (real) | search, recommendations | Monotonic memory growth over 24h+ | Unbounded cache, event listener leak |
| Deployment canary failure | All | Error rate spike within 5 min of deploy | Code regression, config mismatch |
| DNS resolution timeout | All | Intermittent 5xx across multiple services | CoreDNS pod resource pressure |
| Certificate expiry | auth, payments, gateway | TLS handshake failures | Cert-manager misconfiguration |

#### Knowledge Lifecycle

```
New Knowledge Entry
       ↓
  [Source: human]──→ High confidence (immediately active)
       ↓
  [Source: agent]──→ Low confidence (provisional)
       ↓                    ↓
  Corroborated by       Not corroborated
  feedback/evidence     within 30 days
       ↓                    ↓
  Elevated to           Archived
  medium/high           (still searchable)
       ↓
  Periodic review
  (90-day cycle)
```

### Integration Points

- **Doc 00**: Knowledge base referenced in investigation flow
- **Doc 04**: Implementation features for knowledge management
- **Doc 05**: CAP provides knowledge retrieval as a capability

### Implementation Priority

**P1** — Known-issues registry (YAML-based, file-system stored)
**P2** — Service-specific investigation patterns
**P3** — Automated knowledge lifecycle management

---

## 4. Cross-Repo Investigation

**Principle #15**: The system must handle incidents that span multiple repositories and services.

### Problem Statement

Production incidents frequently cross service boundaries. A latency spike in the API gateway may originate from a database migration in a downstream service deployed from a different repository. Current design assumes single-repo investigation context.

### Design

#### Multi-Repo Strategy

```
Incident Signal
       ↓
  Primary Service Identified (e.g., api-gateway)
       ↓
  Dependency Graph Consulted
       ↓
  ┌────┴────┐
  ↓         ↓
Related   Related
Service A  Service B
(auth)    (payments)
  ↓         ↓
Parallel Investigation Branches
  ↓         ↓
  └────┬────┘
       ↓
  Cross-Service Correlation
       ↓
  Unified Findings
```

#### Service Boundary Traversal

The orchestrator follows a **breadth-first** traversal of the service dependency graph:

1. **Identify primary service** from the alert or user request
2. **Retrieve dependency graph** from service catalog (MCP server or static config)
3. **Check upstream/downstream services** for correlated anomalies (same time window)
4. **Spawn sub-investigations** for services showing correlated signals
5. **Merge findings** with cross-service correlation annotations

#### Dependency Graph Awareness

```yaml
# .production-master/knowledge/service-graph.yaml
services:
  api-gateway:
    repo: "org/api-gateway"
    dependencies:
      - service: auth-service
        type: synchronous
        protocol: gRPC
      - service: payments-service
        type: synchronous
        protocol: HTTP
      - service: notification-service
        type: asynchronous
        protocol: Kafka

  auth-service:
    repo: "org/auth-service"
    dependencies:
      - service: user-db
        type: synchronous
        protocol: PostgreSQL
      - service: redis-cache
        type: synchronous
        protocol: Redis
```

#### Cross-Repo Investigation Limits

To prevent investigation explosion:

| Limit | Default | Rationale |
|-------|---------|-----------|
| Max traversal depth | 2 hops | Most incidents are within 2 service boundaries |
| Max parallel sub-investigations | 3 | Resource budget constraint |
| Correlation time window | ±5 minutes | Signals beyond this window are likely unrelated |
| Max repos analyzed | 5 | Token and time budget constraint |

### Integration Points

- **Doc 00**: Multi-agent orchestration supports parallel sub-investigations
- **Doc 03**: Cloud pipeline can spawn multiple worker tasks for cross-repo analysis
- **Doc 05**: CAP provides code analysis capability across repos via GitHub MCP

### Implementation Priority

**P2** — Dependency graph configuration and traversal
**P2** — Cross-service correlation in findings
**P3** — Automated dependency graph discovery

---

## 5. Unknown Unknowns Threat Model

**Principle #33**: The system must account for risks it cannot currently foresee.

### Problem Statement

Beyond known risks (covered in the risk matrix), the system must be resilient to categories of failure that are difficult to anticipate: novel attack vectors, emergent behaviors, and cascading failures in the AI/MCP stack.

### Design

#### Threat Categories

| Category | Threat | Impact | Detection | Mitigation |
|----------|--------|--------|-----------|------------|
| **Prompt Injection** | Malicious content in MCP responses (e.g., crafted log messages) tricks the LLM into harmful actions | Critical | Output validation, anomaly detection on agent behavior | Sanitize all MCP responses; structured outputs only; never execute MCP-returned code; sandboxed evaluation |
| **Model Drift** | Claude model updates change investigation behavior without warning | High | Regression test suite, golden output comparison | Benchmark suite of known investigations; pin model versions in production; A/B test model updates |
| **Vendor Lock-in** | Deep coupling to Anthropic APIs makes migration prohibitively expensive | High | Periodic alternative provider evaluation | CAP abstracts LLM calls; maintain model-agnostic prompt templates; quarterly evaluation |
| **Feedback Loops** | Incorrect agent knowledge propagates and compounds in future investigations | Critical | Provenance tracking, confidence decay monitoring | Tag knowledge source (human vs. agent); confidence scores with time decay; human gates for high-impact updates |
| **MCP Protocol Changes** | Breaking changes in MCP specification | High | Version monitoring, integration test failures | Pin SDK versions; protocol version negotiation; comprehensive test suite; monitor MCP changelog |
| **Supply Chain** | Compromised MCP server dependency | Critical | Dependency scanning, behavioral monitoring | Lock MCP server versions; audit MCP server code; network segmentation; principle of least privilege for MCP permissions |

#### Defense-in-Depth Strategy

```
Layer 1: Input Validation
  - Sanitize all MCP responses before LLM consumption
  - Schema validation on structured data
  - Size limits on all inputs

Layer 2: Behavioral Monitoring
  - Anomaly detection on agent actions (unexpected tool calls, unusual output patterns)
  - Rate limiting on all external calls
  - Circuit breakers on MCP connections

Layer 3: Output Validation
  - Confidence thresholds before publishing findings
  - Human review gate for high-severity findings
  - Audit log of all published outputs

Layer 4: Recovery
  - Investigation rollback (discard findings from a compromised run)
  - Knowledge quarantine (flag and isolate suspicious knowledge entries)
  - Circuit breaker reset procedures
```

#### Chaos Engineering for AI Systems

Periodic resilience testing:

1. **MCP failure injection**: Simulate MCP server outages, slow responses, malformed data
2. **Model degradation simulation**: Run investigations with intentionally weakened prompts
3. **Adversarial inputs**: Inject known-bad patterns in test data to verify sanitization
4. **Budget exhaustion**: Simulate token/cost budget breaches mid-investigation

### Integration Points

- **Doc 00**: Risk matrix extended with these threats
- **Doc 03**: Cloud pipeline implements defense-in-depth layers
- **Doc 04**: Risk register items R11-R14 reference this threat model

### Implementation Priority

**P1** — Input sanitization and output validation
**P2** — Behavioral monitoring and anomaly detection
**P3** — Chaos engineering framework

---

## 6. Autonomous but Controllable

**Principle #42**: The system must be capable of autonomous operation while remaining fully controllable by users.

### Problem Statement

The system operates on a spectrum from fully manual (user drives every step) to fully autonomous (system investigates and publishes without human involvement). The design must support this spectrum with clear guardrails, kill switches, and confidence thresholds.

### Design

#### Autonomy Spectrum

```
Level 0          Level 1           Level 2           Level 3           Level 4
Manual ──────── Assisted ─────── Supervised ──────── Autonomous ──────── Full Auto

User drives    System suggests   System acts,      System acts,       System acts
every step     next steps        user approves     user is notified   independently
                                 before publish    after publish
```

| Level | Investigation | Publishing | Knowledge Update | Use Case |
|-------|--------------|------------|-----------------|----------|
| 0 — Manual | User-driven | User-driven | User-driven | Learning, debugging the system itself |
| 1 — Assisted | System runs, user guides | User publishes | User approves | New team members, unfamiliar domains |
| 2 — Supervised | Autonomous | User approves | User approves | Standard operation (default) |
| 3 — Autonomous | Autonomous | Auto-publish (notify) | Auto-update (notify) | Trusted domains, mature services |
| 4 — Full Auto | Autonomous | Auto-publish (silent) | Auto-update (silent) | CI/CD pipeline, batch processing |

#### Guardrails

Regardless of autonomy level, these guardrails always apply:

| Guardrail | Behavior | Override |
|-----------|----------|----------|
| Severity ceiling | Findings with severity ≥ Critical always require human review | `--force-publish` (audit logged) |
| Blast radius check | Actions affecting >1 service require confirmation | `--cross-service-auto` |
| Cost ceiling | Investigation stops at budget limit | `--override-budget` (requires admin) |
| Rate limit | Max 10 investigations per hour per domain | `--no-rate-limit` (audit logged) |
| Knowledge gate | Agent-generated knowledge starts as provisional | `--trust-agent-knowledge` |

#### Kill Switches

Emergency stop mechanisms:

| Mechanism | Scope | Activation | Effect |
|-----------|-------|------------|--------|
| `Ctrl+C` (twice) | Current investigation | User keyboard | Immediate termination, partial findings discarded |
| `/production-master-stop` | Current investigation | CLI command | Graceful stop, partial findings saved |
| `POST /api/v1/kill` | All active investigations | API call | Platform-wide emergency stop |
| Circuit breaker | Per-MCP-server | Automatic (error threshold) | Specific data source disabled |
| Global pause | All investigations | Admin API | New investigations queued, in-progress complete |

#### Confidence Thresholds for Auto-Publishing

| Confidence Level | Score Range | Auto-Publish Behavior |
|-----------------|-------------|----------------------|
| High | ≥ 0.85 | Auto-publish in Level 3+; notify in Level 2 |
| Medium | 0.60 — 0.84 | Auto-publish in Level 4 only; require approval in Level 2-3 |
| Low | < 0.60 | Never auto-publish; always require human review |

Confidence is calculated from:
- **Evidence strength**: Number and quality of corroborating signals
- **Historical accuracy**: How accurate were similar findings in the past?
- **Domain maturity**: How well does the system know this service?

### Integration Points

- **Doc 00**: User Override Protocol implements Level 0-2 controls
- **Doc 02**: Cursor adapter provides GUI for autonomy level selection
- **Doc 03**: Cloud pipeline implements Level 3-4 operation
- **Doc 04**: Features across all surfaces implement control mechanisms

### Implementation Priority

**P1** — Kill switches and guardrails (safety-critical)
**P1** — Autonomy level selection (per-surface)
**P2** — Confidence-based auto-publishing
**P3** — Full Level 4 autonomous operation

---

## 7. Enterprise Deployment Research

**Principle #26**: The system's architecture should align with established enterprise deployment patterns.

### Problem Statement

Our architecture (K8s + worker pool + custom orchestrator) was designed from first principles. We should validate this against industry patterns for deploying AI-powered investigation/analysis systems at enterprise scale.

### Design

#### Industry Patterns Survey

| Pattern | Used By | Architecture | Strengths | Weaknesses |
|---------|---------|-------------|-----------|------------|
| **Managed Pipeline** | AWS SageMaker, Azure AI Studio | Cloud-managed DAG execution | Zero ops, auto-scaling, integrated monitoring | Vendor lock-in, limited customization, cold starts |
| **Agent Framework** | LangGraph, CrewAI, AutoGen | Graph-based agent orchestration | Purpose-built for agents, community ecosystem | Early-stage, limited production hardening, framework lock-in |
| **K8s-native** | Google Vertex AI, Kubeflow | Kubernetes operators + custom controllers | Portable, mature ecosystem, full control | High ops burden, requires K8s expertise |
| **Serverless** | Modal, Beam | Function-as-a-Service for ML workloads | Cost-efficient for bursty loads, zero idle cost | Cold starts, stateless constraints, limited debugging |
| **Hybrid** | Databricks, Anyscale/Ray | Managed control plane + user-managed workers | Balance of control and convenience | Complexity, dual-environment debugging |

#### Comparison to Our Architecture

Our approach maps closest to the **K8s-native** pattern with elements of **Agent Framework**:

| Aspect | Industry K8s-native | Our Architecture | Gap |
|--------|--------------------|--------------------|-----|
| Orchestration | Kubeflow/Argo | Custom investigation orchestrator | We gain investigation-specific optimizations; lose community tooling |
| Scaling | HPA/KEDA | Worker pool with queue-based scaling | Equivalent |
| Monitoring | Prometheus + Grafana | Same | Aligned |
| Agent framework | LangChain/LangGraph | Custom agent with CAP | We gain tighter integration; lose ecosystem compatibility |
| Cost management | Cloud billing APIs | Custom tracking (see Doc 03) | We need more granular per-investigation tracking |
| Multi-tenancy | Namespace isolation | Worker pool isolation | Need to validate isolation guarantees |

#### Recommendations

1. **Validate K8s approach**: Our architecture is well-aligned with industry patterns. No fundamental redesign needed.
2. **Adopt KEDA for scaling**: Replace custom scaling logic with KEDA event-driven autoscaling where applicable
3. **Consider Argo Workflows**: For complex multi-step investigations, Argo may be more robust than custom orchestration — evaluate as a Phase 3 enhancement
4. **Benchmark against managed**: Run cost/performance comparison against SageMaker Pipelines for the cloud deployment — ensure our approach is justified

### Integration Points

- **Doc 03**: Cloud pipeline deployment architecture references this analysis
- **Doc 04**: Open questions Q11 tracks this research

### Implementation Priority

**P2** — Industry pattern validation and benchmarking
**P3** — KEDA/Argo evaluation and potential adoption

---

## Cross-Reference Matrix

How these gap areas connect to existing design documents and implementation items:

| Gap Area | Doc 00 | Doc 01 | Doc 02 | Doc 03 | Doc 04 | Doc 05 | Doc 06 |
|----------|--------|--------|--------|--------|--------|--------|--------|
| User Feedback Loop | Override Protocol | — | — | — | C19, U18, P29 | CAP storage | — |
| Self-Improvement Agent | Observability | — | — | Async worker | P30 | — | Phase 6 |
| Domain Knowledge Base | Knowledge refs | — | — | — | — | Knowledge capability | — |
| Cross-Repo Investigation | Multi-agent | — | — | Multi-worker | — | Code analysis CAP | — |
| Unknown Unknowns | Risk matrix | — | — | Security | R11-R14 | — | — |
| Autonomous but Controllable | Override Protocol | — | Autonomy UI | Kill switches | — | — | — |
| Enterprise Deployment | — | — | — | Industry patterns | Q11, Q12 | — | — |

---

## Implementation Roadmap

| Priority | Items | Target Phase |
|----------|-------|-------------|
| **P1** | Feedback commands, kill switches, guardrails, input sanitization, known-issues registry, debug bundle API | Phase 4-5 |
| **P2** | Self-improvement agent, cross-repo investigation, confidence-based publishing, dependency graph, cost tracking | Phase 5-6 |
| **P3** | Chaos engineering, full autonomy (Level 4), automated knowledge lifecycle, KEDA/Argo evaluation | Phase 6+ |

---

*This document addresses strategic principles #15, #16, #17, #19, #26, #33, and #42 as identified in the 42-principle audit. All inline updates to existing documents (principles with partial coverage) are tracked in the corresponding doc changelogs.*
