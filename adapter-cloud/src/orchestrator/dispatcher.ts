/**
 * Agent Dispatcher — wraps agent-runner with orchestration-level concerns:
 * metrics, logging, error handling, tracing spans, and DB record persistence.
 */

import type { Context as OtelContext } from '@opentelemetry/api';
import { runAgent, type AgentRunOptions, type AgentOutput, type AgentRunRecord } from '../workers/agent-runner.js';
import type { McpRegistry } from '../workers/tool-handler.js';
import { query } from '../storage/db.js';
import {
  createLogger,
  startAgentSpan,
  recordSpanError,
  pmAgentDurationSeconds,
  pmAgentTokensTotal,
} from '../observability/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchOptions {
  /** Investigation ID for correlation */
  investigationId: string;
  /** Agent name to run */
  agentName: string;
  /** Investigation context injected into the agent prompt */
  investigationContext?: string;
  /** MCP registry instance */
  mcpRegistry: McpRegistry;
  /** Investigation mode (affects model selection) */
  mode?: string;
  /** Parent trace context for creating child spans */
  traceCtx?: OtelContext;
  /** Domain name for span attributes */
  domain?: string;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('orchestrator:dispatcher');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Dispatch a single agent run with full observability.
 *
 * - Creates a child tracing span for the agent invocation
 * - Logs start/end
 * - Records duration and token metrics
 * - Persists agent run record to DB
 * - Returns the agent output
 */
export async function dispatchAgent(options: DispatchOptions): Promise<AgentOutput> {
  const { investigationId, agentName, investigationContext, mcpRegistry, traceCtx, domain } = options;

  // Start an agent-level tracing span (child of the investigation root span).
  // When traceCtx is undefined the span is created without a parent, which
  // is fine — the OTel API treats non-recording spans as no-ops.
  const { span: agentSpan, ctx: agentCtx } = startAgentSpan(
    traceCtx ?? (await import('@opentelemetry/api')).context.active(),
    {
      investigation_id: investigationId,
      agent_name: agentName,
      domain,
    },
  );

  log.info('Dispatching agent', {
    investigation_id: investigationId,
    agent: agentName,
  });

  const startTime = Date.now();

  const runOptions: AgentRunOptions = {
    investigationContext,
    mcpRegistry,
    traceCtx: agentCtx,
    investigationId,
    domain,
    onOutput: async (output: AgentOutput) => {
      // Persist output content to DB
      try {
        await query(
          `INSERT INTO agent_outputs (investigation_id, agent_name, content, token_usage, iterations, stop_reason)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            investigationId,
            output.agentName,
            output.content,
            JSON.stringify(output.tokenUsage),
            output.iterations,
            output.stopReason,
          ],
        );
      } catch (err) {
        log.error('Failed to persist agent output', {
          investigation_id: investigationId,
          agent: agentName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    onRecord: async (record: AgentRunRecord) => {
      // Persist run metadata to DB
      try {
        await query(
          `INSERT INTO agent_runs (investigation_id, agent_name, model, iterations, token_usage, stop_reason, started_at, completed_at, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            investigationId,
            record.agentName,
            record.model,
            record.iterations,
            JSON.stringify(record.tokenUsage),
            record.stopReason,
            record.startedAt,
            record.completedAt,
            record.durationMs,
          ],
        );
      } catch (err) {
        log.error('Failed to persist agent run record', {
          investigation_id: investigationId,
          agent: agentName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };

  try {
    const output = await runAgent(agentName, { investigationContext }, runOptions);

    const durationMs = Date.now() - startTime;
    const durationSec = durationMs / 1000;

    // Record metrics
    pmAgentDurationSeconds.observe({ agent: agentName }, durationSec);
    pmAgentTokensTotal.inc({ agent: agentName, direction: 'input' }, output.tokenUsage.inputTokens);
    pmAgentTokensTotal.inc({ agent: agentName, direction: 'output' }, output.tokenUsage.outputTokens);

    // Enrich span with outcome
    agentSpan.setAttribute('pm.iterations', output.iterations);
    agentSpan.setAttribute('pm.stop_reason', output.stopReason);
    agentSpan.setAttribute('pm.tokens_total', output.tokenUsage.totalTokens);
    agentSpan.end();

    log.info('Agent completed', {
      investigation_id: investigationId,
      agent: agentName,
      duration_ms: durationMs,
      iterations: output.iterations,
      stop_reason: output.stopReason,
      tokens: output.tokenUsage.totalTokens,
    });

    return output;
  } catch (err) {
    const durationMs = Date.now() - startTime;

    recordSpanError(agentSpan, err);
    agentSpan.end();

    log.error('Agent failed', {
      investigation_id: investigationId,
      agent: agentName,
      duration_ms: durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
