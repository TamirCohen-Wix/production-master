/**
 * Observability stack for production-master cloud pipeline.
 *
 * Re-exports tracing, metrics, and logging modules for convenient
 * single-import usage:
 *
 * ```ts
 * import { initTracing, initMetrics, createLogger } from './observability/index.js';
 * ```
 */

export { initTracing, getTracer } from './tracing.js';
export {
  initMetrics,
  getMetricsEndpoint,
  register,
  // Investigation lifecycle
  pmInvestigationTotal,
  pmInvestigationDurationSeconds,
  pmInvestigationVerdict,
  pmInvestigationHypothesisIterations,
  // Agent execution
  pmAgentInvocationTotal,
  pmAgentInvocationDurationSeconds,
  pmAgentDurationSeconds,
  pmAgentTokensTotal,
  // MCP calls
  pmMcpToolCallTotal,
  pmMcpToolCallDurationSeconds,
  pmMcpCallDurationSeconds,
  pmMcpCallErrorsTotal,
  // Hypothesis loop (legacy)
  pmHypothesisIterations,
  pmHypothesisConfidence,
  // Cost tracking
  pmLlmTokensTotal,
  pmLlmCostDollarsTotal,
  pmLlmCostDollars,
  // Infrastructure
  pmQueueDepth,
  pmWorkerUtilization,
} from './metrics.js';
export { createLogger } from './logging.js';
