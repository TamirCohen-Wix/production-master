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
import { query, transaction } from '../storage/db.js';
import type { McpRegistry } from '../workers/tool-handler.js';
import { dispatchAgent } from './dispatcher.js';
import { runHypothesisLoop } from './hypothesis-loop.js';
import { createLogger } from '../observability/index.js';
import {
  pmInvestigationDurationSeconds,
  pmInvestigationVerdict,
  pmQueueDepth,
} from '../observability/index.js';

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
  context: string,
  mcpRegistry: McpRegistry,
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
          investigationContext: context,
          mcpRegistry,
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
    output = context;
  } else {
    // Standard single-agent phase
    const agentOutput = await dispatchAgent({
      investigationId,
      agentName: phase,
      investigationContext: context,
      mcpRegistry,
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
  job: InvestigationJob,
  mcpRegistry: McpRegistry,
): Promise<void> {
  const { investigation_id: investigationId } = job;
  const startTime = Date.now();

  log.info('Investigation started', {
    investigation_id: investigationId,
    ticket_id: job.ticket_id,
    mode: job.mode,
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
        });

        accumulatedContext += `\n\n[hypothesize]\nAccepted hypothesis: ${hypothesisResult.accepted_hypothesis.hypothesis}\nConfidence: ${hypothesisResult.accepted_hypothesis.confidence}\nIterations: ${hypothesisResult.iterations}\nConverged: ${hypothesisResult.converged}`;

        await updateStatus(investigationId, 'hypothesize', 'running:hypothesize');
      } else if (phase === 'deliver') {
        // Phase 9: deliver — persist final report and send callback
        await updateStatus(investigationId, 'deliver', 'running:deliver');
        await deliverReport(investigationId, accumulatedContext, job.callback_url);
      } else {
        const result = await runPhase(phase, investigationId, accumulatedContext, mcpRegistry);
        accumulatedContext += `\n\n[${phase}]\n${result.output}`;
      }
    }

    // Mark completed
    const durationSec = (Date.now() - startTime) / 1000;
    await query(
      'UPDATE investigations SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['completed', investigationId],
    );

    pmInvestigationDurationSeconds.observe({ status: 'completed' }, durationSec);
    pmInvestigationVerdict.inc({ verdict: 'completed' });

    log.info('Investigation completed', {
      investigation_id: investigationId,
      duration_seconds: durationSec,
    });
  } catch (err) {
    const durationSec = (Date.now() - startTime) / 1000;

    await query(
      "UPDATE investigations SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2",
      [err instanceof Error ? err.message : String(err), investigationId],
    );

    pmInvestigationDurationSeconds.observe({ status: 'failed' }, durationSec);
    pmInvestigationVerdict.inc({ verdict: 'failed' });

    log.error('Investigation failed', {
      investigation_id: investigationId,
      duration_seconds: durationSec,
      error: err instanceof Error ? err.message : String(err),
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
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigation_id: investigationId,
          status: 'completed',
          report_url: `/api/v1/investigations/${investigationId}/report`,
        }),
      });
      log.info('Callback delivered', { investigation_id: investigationId, callback_url: callbackUrl });
    } catch (err) {
      log.error('Callback delivery failed', {
        investigation_id: investigationId,
        callback_url: callbackUrl,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
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
