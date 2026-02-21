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

export {
  initTracing,
  shutdownTracing,
  getTracer,
  startInvestigationSpan,
  startAgentSpan,
  startToolCallSpan,
  startHypothesisSpan,
  recordSpanError,
  injectTraceContext,
  extractTraceContext,
  getActiveTraceId,
} from './tracing.js';
export type {
  InvestigationSpanAttributes,
  AgentSpanAttributes,
  ToolCallSpanAttributes,
  HypothesisSpanAttributes,
  TraceCarrier,
} from './tracing.js';
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
  pmJiraAssignmentTotal,
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
