/**
 * Scheduled Job Runner — BullMQ-based job scheduler for recurring tasks.
 *
 * Manages repeatable jobs using BullMQ's built-in cron support. Each job
 * type registers its handler with the scheduler, and cron schedules are
 * configurable via environment variables.
 *
 * Environment variables:
 *   REDIS_URL                     — Redis connection (default: redis://localhost:6379)
 *   HEALTH_CHECK_CRON             — Cron for MCP health checks (default: "0 * * * *" = hourly)
 *   STALE_TICKET_REVIEW_CRON      — Cron for stale ticket review (default: "0 8 * * *" = daily 08:00)
 *   SCHEDULED_JOBS_ENABLED        — Set to "false" to disable all scheduled jobs
 */

import { Queue, Worker, type Job } from 'bullmq';
import { createLogger } from '../observability/index.js';
import { getRedisUrl } from '../config/wix-config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledJobDefinition {
  /** Unique name for this job type (used as the BullMQ job name). */
  name: string;
  /** Default cron expression (can be overridden via env var). */
  defaultCron: string;
  /** Environment variable name that overrides the cron schedule. */
  cronEnvVar: string;
  /** The handler function executed when the job fires. */
  handler: (job: Job) => Promise<void>;
}

export interface SchedulerOptions {
  /** Override Redis URL (falls back to REDIS_URL env var). */
  redisUrl?: string;
  /** Override whether scheduled jobs are enabled. */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'scheduled-jobs';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('jobs:scheduler');

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

let queue: Queue | undefined;
let worker: Worker | undefined;
const jobDefinitions = new Map<string, ScheduledJobDefinition>();

/**
 * Register a job definition with the scheduler.
 *
 * Must be called before `startScheduler()`. Registered jobs will be
 * scheduled as repeatable BullMQ jobs with their configured cron.
 */
export function registerJob(definition: ScheduledJobDefinition): void {
  jobDefinitions.set(definition.name, definition);
  log.debug('Registered scheduled job', { job: definition.name });
}

/**
 * Start the scheduler: creates the BullMQ queue, adds repeatable jobs,
 * and starts the worker that processes them.
 */
export async function startScheduler(options: SchedulerOptions = {}): Promise<void> {
  const enabled = options.enabled ?? (process.env.SCHEDULED_JOBS_ENABLED !== 'false');
  if (!enabled) {
    log.info('Scheduled jobs disabled via configuration');
    return;
  }

  if (jobDefinitions.size === 0) {
    log.warn('No scheduled jobs registered — scheduler will not start');
    return;
  }

  const redisUrl = options.redisUrl ?? getRedisUrl();
  const connection = { url: redisUrl };

  // Create queue
  queue = new Queue(QUEUE_NAME, { connection });

  // Register repeatable jobs
  for (const [name, definition] of jobDefinitions) {
    const cron = process.env[definition.cronEnvVar] ?? definition.defaultCron;

    await queue.upsertJobScheduler(
      name,
      { pattern: cron },
      {
        name,
        opts: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 100 },
        },
      },
    );

    log.info('Scheduled job registered', { job: name, cron });
  }

  // Create worker to process scheduled jobs
  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const definition = jobDefinitions.get(job.name);
      if (!definition) {
        log.warn('Received job with no registered handler', { job_name: job.name });
        return;
      }

      log.info('Executing scheduled job', { job_name: job.name, job_id: job.id });
      const start = Date.now();

      try {
        await definition.handler(job);
        const durationMs = Date.now() - start;
        log.info('Scheduled job completed', { job_name: job.name, duration_ms: durationMs });
      } catch (err) {
        const durationMs = Date.now() - start;
        log.error('Scheduled job failed', {
          job_name: job.name,
          duration_ms: durationMs,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on('failed', (job, err) => {
    log.error('Scheduled job worker failure', {
      job_id: job?.id,
      job_name: job?.name,
      error: err.message,
    });
  });

  log.info('Scheduler started', { jobs: [...jobDefinitions.keys()] });
}

/**
 * Gracefully stop the scheduler: close worker and queue.
 */
export async function stopScheduler(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = undefined;
    log.info('Scheduler worker stopped');
  }

  if (queue) {
    await queue.close();
    queue = undefined;
    log.info('Scheduler queue closed');
  }
}

/**
 * Return the underlying BullMQ queue (for testing / inspection).
 */
export function getSchedulerQueue(): Queue | undefined {
  return queue;
}
