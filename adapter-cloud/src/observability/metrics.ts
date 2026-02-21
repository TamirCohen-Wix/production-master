/**
 * Prometheus metrics for production-master cloud pipeline.
 *
 * Exposes domain-specific metrics via prom-client and a
 * metrics HTTP handler for scraping.
 *
 * Metrics are grouped into:
 *   - Investigation lifecycle (totals, duration, verdicts, hypothesis iterations)
 *   - Agent execution (invocations, duration, tokens)
 *   - MCP tool calls (totals, duration, errors)
 *   - Cost tracking (tokens by model, LLM spend)
 *   - Infrastructure gauges (queue depth, worker utilization)
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import type { Request, Response } from 'express';

const register = new Registry();

// ---------------------------------------------------------------------------
// Investigation lifecycle
// ---------------------------------------------------------------------------

/** Total investigations started, labelled by domain, status, and trigger source. */
export const pmInvestigationTotal = new Counter({
  name: 'pm_investigation_total',
  help: 'Total number of investigations started',
  labelNames: ['domain', 'status', 'trigger_source'] as const,
  registers: [register],
});

/** Wall-clock duration of a full investigation run. */
export const pmInvestigationDurationSeconds = new Histogram({
  name: 'pm_investigation_duration_seconds',
  help: 'Duration of an investigation in seconds',
  labelNames: ['domain', 'status'] as const,
  buckets: [5, 15, 30, 60, 120, 300, 600],
  registers: [register],
});

/** Final verdicts emitted, labelled by verdict category. */
export const pmInvestigationVerdict = new Counter({
  name: 'pm_investigation_verdict',
  help: 'Investigation verdicts by category',
  labelNames: ['verdict'] as const,
  registers: [register],
});

/** Number of hypothesis iterations per investigation. */
export const pmInvestigationHypothesisIterations = new Histogram({
  name: 'pm_investigation_hypothesis_iterations',
  help: 'Number of hypothesis iterations per investigation',
  labelNames: ['domain'] as const,
  buckets: [1, 2, 3, 5, 8, 13],
  registers: [register],
});

// ---------------------------------------------------------------------------
// Agent execution
// ---------------------------------------------------------------------------

/** Total agent invocations, labelled by agent name and domain. */
export const pmAgentInvocationTotal = new Counter({
  name: 'pm_agent_invocation_total',
  help: 'Total number of agent invocations',
  labelNames: ['agent_name', 'domain'] as const,
  registers: [register],
});

/** Per-agent invocation duration. */
export const pmAgentInvocationDurationSeconds = new Histogram({
  name: 'pm_agent_invocation_duration_seconds',
  help: 'Duration of agent invocations in seconds',
  labelNames: ['agent_name'] as const,
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

/** Per-agent execution time (legacy, kept for backward compatibility). */
export const pmAgentDurationSeconds = new Histogram({
  name: 'pm_agent_duration_seconds',
  help: 'Duration of agent execution in seconds',
  labelNames: ['agent'] as const,
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

/** Total tokens consumed per agent invocation. */
export const pmAgentTokensTotal = new Counter({
  name: 'pm_agent_tokens_total',
  help: 'Total tokens consumed by agents',
  labelNames: ['agent', 'direction'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// MCP calls
// ---------------------------------------------------------------------------

/** Total MCP tool calls, labelled by server, tool, and status. */
export const pmMcpToolCallTotal = new Counter({
  name: 'pm_mcp_tool_call_total',
  help: 'Total MCP tool calls',
  labelNames: ['server', 'tool', 'status'] as const,
  registers: [register],
});

/** Duration of individual MCP tool calls. */
export const pmMcpToolCallDurationSeconds = new Histogram({
  name: 'pm_mcp_tool_call_duration_seconds',
  help: 'Duration of MCP tool calls in seconds',
  labelNames: ['server'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/** Duration of individual MCP tool calls (legacy, kept for backward compatibility). */
export const pmMcpCallDurationSeconds = new Histogram({
  name: 'pm_mcp_call_duration_seconds',
  help: 'Duration of MCP tool calls in seconds (legacy)',
  labelNames: ['server', 'tool'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/** MCP call errors (legacy, kept for backward compatibility). */
export const pmMcpCallErrorsTotal = new Counter({
  name: 'pm_mcp_call_errors_total',
  help: 'Total MCP call errors',
  labelNames: ['server', 'tool', 'error_type'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// Hypothesis loop (legacy metrics — kept for backward compatibility)
// ---------------------------------------------------------------------------

/** Number of hypothesis iterations per investigation (legacy). */
export const pmHypothesisIterations = new Histogram({
  name: 'pm_hypothesis_iterations',
  help: 'Number of hypothesis iterations per investigation (legacy)',
  buckets: [1, 2, 3, 5, 8, 13],
  registers: [register],
});

/** Final confidence score of the accepted hypothesis. */
export const pmHypothesisConfidence = new Histogram({
  name: 'pm_hypothesis_confidence',
  help: 'Confidence score of accepted hypothesis',
  buckets: [0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0],
  registers: [register],
});

// ---------------------------------------------------------------------------
// Cost tracking
// ---------------------------------------------------------------------------

/** Total LLM tokens consumed, labelled by model and type (input/output). */
export const pmLlmTokensTotal = new Counter({
  name: 'pm_llm_tokens_total',
  help: 'Total LLM tokens consumed',
  labelNames: ['model', 'type'] as const,
  registers: [register],
});

/** Cumulative LLM spend in USD, labelled by model and domain. */
export const pmLlmCostDollarsTotal = new Counter({
  name: 'pm_llm_cost_dollars_total',
  help: 'Cumulative LLM cost in US dollars',
  labelNames: ['model', 'domain'] as const,
  registers: [register],
});

/** Cumulative LLM spend in USD (legacy, kept for backward compatibility). */
export const pmLlmCostDollars = new Counter({
  name: 'pm_llm_cost_dollars',
  help: 'Cumulative LLM cost in US dollars (legacy)',
  labelNames: ['model'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// Infrastructure gauges
// ---------------------------------------------------------------------------

/** Current number of items in the investigation queue. */
export const pmQueueDepth = new Gauge({
  name: 'pm_queue_depth',
  help: 'Current investigation queue depth',
  labelNames: ['queue'] as const,
  registers: [register],
});

/** Fraction of worker slots currently busy (0-1). */
export const pmWorkerUtilization = new Gauge({
  name: 'pm_worker_utilization',
  help: 'Worker utilization ratio (0-1)',
  labelNames: ['pool'] as const,
  registers: [register],
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the metrics subsystem.
 *
 * Registers default Node.js runtime metrics (GC, event-loop, etc.)
 * with a `pm_` prefix so they do not collide with other exporters.
 */
export function initMetrics(): void {
  collectDefaultMetrics({ register, prefix: 'pm_' });
}

/**
 * Express-compatible handler that returns Prometheus text exposition format.
 */
export async function getMetricsEndpoint(
  _req: Request,
  res: Response,
): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register };
