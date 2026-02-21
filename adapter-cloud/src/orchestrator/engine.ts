/**
 * Orchestrator Engine — 9-phase investigation pipeline state machine.
 *
 * Phases:
 *   1. intake       — Parse ticket, extract metadata
 *   2. triage       — Classify severity, determine scope
 *   3. context      — Gather domain context and historical data
 *   4. gather       — Run parallel gather agents (logs, changes, slack, metrics)
 *   5. hypothesize  — Generate and verify root-cause hypotheses
 *   6. analyze      — Deep-dive analysis on accepted hypothesis
 *   7. recommend    — Generate actionable recommendations
 *   8. report       — Compile final investigation report
 *   9. deliver      — Persist report, notify via callback
 *
 * Phase 4 runs gather agents in parallel for maximum throughput.
 *
 * Processes BullMQ jobs from the "investigations" queue.
 */

import { Worker, type Job } from 'bullmq';
import { context as otelContext, type Context as OtelContext } from '@opentelemetry/api';
import { query, transaction } from '../storage/db.js';
import type { McpRegistry } from '../workers/tool-handler.js';
import { dispatchAgent } from './dispatcher.js';
import { runHypothesisLoop } from './hypothesis-loop.js';
import {
  createLogger,
  startInvestigationSpan,
  recordSpanError,
  extractTraceContext,
  getActiveTraceId,
  pmInvestigationDurationSeconds,
  pmInvestigationVerdict,
  pmQueueDepth,
} from '../observability/index.js';
import type { TraceCarrier } from '../observability/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase =
  | 'intake'
  | 'triage'
  | 'context'
  | 'gather'
  | 'hypothesize'
  | 'analyze'
  | 'recommend'
  | 'report'
  | 'deliver';

export interface InvestigationJob {
  investigation_id: string;
  ticket_id: string;
  domain?: string;
  mode: string;
  callback_url?: string;
  requested_by: string;
}

export interface PhaseResult {
  phase: Phase;
  output: string;
  duration_ms: number;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('orchestrator:engine');

const PHASES: Phase[] = [
  'intake',
  'triage',
  'context',
  'gather',
  'hypothesize',
  'analyze',
  'recommend',
  'report',
  'deliver',
];

/** Agents to run in parallel during the gather phase. */
const GATHER_AGENTS = ['gather-logs', 'gather-changes', 'gather-slack', 'gather-metrics'];

// ---------------------------------------------------------------------------
// Phase handlers
// ---------------------------------------------------------------------------

async function updateStatus(investigationId: string, phase: Phase, status: string): Promise<void> {
  await query(
    'UPDATE investigations SET status = $1, current_phase = $2, updated_at = NOW() WHERE id = $3',
    [status, phase, investigationId],
  );
}

async function runPhase(
  phase: Phase,
  investigationId: string,
  phaseContext: string,
  mcpRegistry: McpRegistry,
  traceCtx?: OtelContext,
  domain?: string,
): Promise<PhaseResult> {
  const start = Date.now();

  await updateStatus(investigationId, phase, `running:${phase}`);

  let output: string;

  if (phase === 'gather') {
    // Phase 4: run gather agents in parallel
    const results = await Promise.allSettled(
      GATHER_AGENTS.map((agent) =>
        dispatchAgent({
          investigationId,
          agentName: agent,
          investigationContext: phaseContext,
          mcpRegistry,
          traceCtx,
          domain,
        }),
      ),
    );

    const outputs: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const agentName = GATHER_AGENTS[i];
      if (result.status === 'fulfilled') {
        outputs.push(`[${agentName}]\n${result.value.content}`);
      } else {
        log.error('Gather agent failed', {
          investigation_id: investigationId,
          agent: agentName,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
        outputs.push(`[${agentName}] ERROR: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }
    output = outputs.join('\n\n---\n\n');
  } else if (phase === 'deliver') {
    // Phase 9: persist and notify — no agent call needed
    output = phaseContext;
  } else {
    // Standard single-agent phase
    const agentOutput = await dispatchAgent({
      investigationId,
      agentName: phase,
      investigationContext: phaseContext,
      mcpRegistry,
      traceCtx,
      domain,
    });
    output = agentOutput.content;
  }

  const duration_ms = Date.now() - start;

  // Persist phase result
  try {
    await query(
      `INSERT INTO investigation_phases (investigation_id, phase, output, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [investigationId, phase, output, duration_ms],
    );
  } catch (err) {
    log.error('Failed to persist phase result', {
      investigation_id: investigationId,
      phase,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { phase, output, duration_ms };
}

// ---------------------------------------------------------------------------
// Pipeline executor
// ---------------------------------------------------------------------------

async function executeInvestigation(
  job: InvestigationJob & TraceCarrier,
  mcpRegistry: McpRegistry,
): Promise<void> {
  const { investigation_id: investigationId } = job;
  const startTime = Date.now();

  // Extract trace context propagated from the API request via BullMQ job data.
  // Falls back to the current active context when no trace header is present.
  const parentCtx = extractTraceContext(job);

  // Start the root investigation span
  const { span: investigationSpan, ctx: investigationCtx } =
    startInvestigationSpan({
      investigation_id: investigationId,
      domain: job.domain,
    });

  // Use parent context from BullMQ when available, otherwise use the new span context
  const rootCtx = parentCtx === otelContext.active() ? investigationCtx : parentCtx;

  const traceId = getActiveTraceId();

  log.info('Investigation started', {
    investigation_id: investigationId,
    ticket_id: job.ticket_id,
    mode: job.mode,
    trace_id: traceId,
  });

  let accumulatedContext = `Ticket: ${job.ticket_id}\nDomain: ${job.domain ?? 'auto-detect'}\nMode: ${job.mode}\nRequested by: ${job.requested_by}`;

  try {
    for (const phase of PHASES) {
      if (phase === 'hypothesize') {
        // Phase 5: use the hypothesis loop instead of a single agent
        const hypothesisResult = await runHypothesisLoop({
          investigationId,
          gatherContext: accumulatedContext,
          mcpRegistry,
          traceCtx: rootCtx,
          domain: job.domain,
        });

        accumulatedContext += `\n\n[hypothesize]\nAccepted hypothesis: ${hypothesisResult.accepted_hypothesis.hypothesis}\nConfidence: ${hypothesisResult.accepted_hypothesis.confidence}\nIterations: ${hypothesisResult.iterations}\nConverged: ${hypothesisResult.converged}`;

        await updateStatus(investigationId, 'hypothesize', 'running:hypothesize');
      } else if (phase === 'deliver') {
        // Phase 9: deliver — persist final report and send callback
        await updateStatus(investigationId, 'deliver', 'running:deliver');
        await deliverReport(investigationId, accumulatedContext, job.callback_url);
      } else {
        const result = await runPhase(phase, investigationId, accumulatedContext, mcpRegistry, rootCtx, job.domain);
        accumulatedContext += `\n\n[${phase}]\n${result.output}`;
      }
    }

    // Mark completed
    const durationSec = (Date.now() - startTime) / 1000;
    await query(
      'UPDATE investigations SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['completed', investigationId],
    );

    investigationSpan.setAttribute('pm.status', 'completed');
    investigationSpan.setAttribute('pm.duration_seconds', durationSec);
    investigationSpan.end();

    pmInvestigationDurationSeconds.observe({ status: 'completed' }, durationSec);
    pmInvestigationVerdict.inc({ verdict: 'completed' });

    log.info('Investigation completed', {
      investigation_id: investigationId,
      duration_seconds: durationSec,
      trace_id: traceId,
    });
  } catch (err) {
    const durationSec = (Date.now() - startTime) / 1000;

    await query(
      "UPDATE investigations SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2",
      [err instanceof Error ? err.message : String(err), investigationId],
    );

    recordSpanError(investigationSpan, err);
    investigationSpan.setAttribute('pm.status', 'failed');
    investigationSpan.end();

    pmInvestigationDurationSeconds.observe({ status: 'failed' }, durationSec);
    pmInvestigationVerdict.inc({ verdict: 'failed' });

    log.error('Investigation failed', {
      investigation_id: investigationId,
      duration_seconds: durationSec,
      error: err instanceof Error ? err.message : String(err),
      trace_id: traceId,
    });

    throw err;
  }
}

async function deliverReport(
  investigationId: string,
  reportContent: string,
  callbackUrl?: string,
): Promise<void> {
  // Persist report to DB
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO investigation_reports (investigation_id, verdict, confidence, summary, evidence, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        investigationId,
        'see_report',
        0.0,
        reportContent.slice(0, 1000),
        JSON.stringify({ full_report: reportContent }),
        JSON.stringify([]),
      ],
    );
  });

  // Send callback if URL provided
  if (callbackUrl) {
    // Fetch verdict and confidence from the report we just persisted
    const reportRow = await query<{ verdict: string; confidence: number }>(
      'SELECT verdict, confidence FROM investigation_reports WHERE investigation_id = $1 LIMIT 1',
      [investigationId],
    );
    const verdict = reportRow.rows[0]?.verdict ?? 'see_report';
    const confidence = reportRow.rows[0]?.confidence ?? 0.0;

    // Fetch ticket_id from the investigation record
    const invRow = await query<{ ticket_id: string }>(
      'SELECT ticket_id FROM investigations WHERE id = $1',
      [investigationId],
    );
    const ticketId = invRow.rows[0]?.ticket_id ?? 'unknown';

    await deliverCallback(callbackUrl, {
      investigation_id: investigationId,
      ticket_id: ticketId,
      status: 'completed',
      verdict,
      confidence,
      report_url: `/api/v1/investigations/${investigationId}/report`,
    });
  }
}

/**
 * Deliver a callback webhook with retry (3 attempts, exponential backoff).
 */
async function deliverCallback(
  callbackUrl: string,
  payload: {
    investigation_id: string;
    ticket_id: string;
    status: string;
    verdict: string;
    confidence: number;
    report_url: string;
  },
): Promise<void> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        log.info('Callback delivered', {
          investigation_id: payload.investigation_id,
          callback_url: callbackUrl,
          attempt,
        });
        return;
      }

      log.warn('Callback returned non-OK status', {
        investigation_id: payload.investigation_id,
        callback_url: callbackUrl,
        status: response.status,
        attempt,
      });
    } catch (err) {
      log.warn('Callback attempt failed', {
        investigation_id: payload.investigation_id,
        callback_url: callbackUrl,
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  log.error('Callback delivery failed after all retries', {
    investigation_id: payload.investigation_id,
    callback_url: callbackUrl,
    max_retries: MAX_RETRIES,
  });
}

// ---------------------------------------------------------------------------
// BullMQ Worker
// ---------------------------------------------------------------------------

let worker: Worker | undefined;

/**
 * Start the orchestrator engine as a BullMQ worker.
 *
 * Processes jobs from the "investigations" queue and runs them through
 * the 9-phase pipeline.
 */
export function startEngine(mcpRegistry: McpRegistry): Worker {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  worker = new Worker<InvestigationJob>(
    'investigations',
    async (job: Job<InvestigationJob>) => {
      pmQueueDepth.dec({ queue: 'investigations' });
      await executeInvestigation(job.data, mcpRegistry);
    },
    {
      connection: { url: redisUrl },
      concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '3', 10),
    },
  );

  worker.on('completed', (job) => {
    log.info('Job completed', { job_id: job?.id });
  });

  worker.on('failed', (job, err) => {
    log.error('Job failed', {
      job_id: job?.id,
      error: err.message,
    });
  });

  log.info('Orchestrator engine started', {
    concurrency: process.env.WORKER_CONCURRENCY ?? '3',
  });

  return worker;
}

/**
 * Gracefully shut down the orchestrator worker.
 */
export async function stopEngine(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = undefined;
    log.info('Orchestrator engine stopped');
  }
}
