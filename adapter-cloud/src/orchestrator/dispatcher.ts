/**
 * Agent Dispatcher — wraps agent-runner with orchestration-level concerns:
 * metrics, logging, error handling, and DB record persistence.
 */

import { runAgent, type AgentRunOptions, type AgentOutput, type AgentRunRecord } from '../workers/agent-runner.js';
import type { McpRegistry } from '../workers/tool-handler.js';
import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';
import {
  pmAgentDurationSeconds,
  pmAgentInvocationTotal,
  pmAgentInvocationDurationSeconds,
  pmAgentTokensTotal,
  pmLlmTokensTotal,
  pmLlmCostDollarsTotal,
  pmLlmCostDollars,
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
  /** Domain for metric labelling */
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
 * - Logs start/end
 * - Records duration and token metrics
 * - Persists agent run record to DB
 * - Returns the agent output
 */
export async function dispatchAgent(options: DispatchOptions): Promise<AgentOutput> {
  const { investigationId, agentName, investigationContext, mcpRegistry, domain } = options;
  const domainLabel = domain ?? 'unknown';

  log.info('Dispatching agent', {
    investigation_id: investigationId,
    agent: agentName,
  });

  const startTime = Date.now();

  const runOptions: AgentRunOptions = {
    investigationContext,
    mcpRegistry,
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

    // Record metrics — new metrics
    pmAgentInvocationTotal.inc({ agent_name: agentName, domain: domainLabel });
    pmAgentInvocationDurationSeconds.observe({ agent_name: agentName }, durationSec);
    pmLlmTokensTotal.inc({ model: agentName, type: 'input' }, output.tokenUsage.inputTokens);
    pmLlmTokensTotal.inc({ model: agentName, type: 'output' }, output.tokenUsage.outputTokens);

    // Record metrics — legacy metrics (backward compatibility)
    pmAgentDurationSeconds.observe({ agent: agentName }, durationSec);
    pmAgentTokensTotal.inc({ agent: agentName, direction: 'input' }, output.tokenUsage.inputTokens);
    pmAgentTokensTotal.inc({ agent: agentName, direction: 'output' }, output.tokenUsage.outputTokens);

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
    log.error('Agent failed', {
      investigation_id: investigationId,
      agent: agentName,
      duration_ms: durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
