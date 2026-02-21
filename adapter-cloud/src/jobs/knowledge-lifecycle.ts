/**
 * Knowledge Lifecycle Job — scheduled daily maintenance for knowledge entries.
 *
 * Actions:
 *   - Archive provisional entries >30 days old with no corroboration
 *   - Downgrade active entries not verified in 90 days to provisional
 *
 * Environment variables:
 *   KNOWLEDGE_LIFECYCLE_CRON  — Override schedule (default: "0 3 * * *" = daily at 03:00)
 */

import type { Job } from 'bullmq';
import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';
import { registerJob } from './scheduler.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('jobs:knowledge-lifecycle');

// ---------------------------------------------------------------------------
// Job handler
// ---------------------------------------------------------------------------

/**
 * Execute the knowledge lifecycle maintenance.
 */
export async function executeKnowledgeLifecycle(): Promise<{
  archived: number;
  downgraded: number;
}> {
  // Archive provisional entries >30 days old
  const archiveResult = await query<{ id: string }>(
    `UPDATE knowledge_entries
     SET confidence = 'archived', archived_at = NOW()
     WHERE confidence = 'provisional'
       AND created_at < NOW() - INTERVAL '30 days'
       AND source != 'corroborated'
     RETURNING id`,
  );

  const archived = archiveResult.rows.length;

  // Downgrade active entries not verified in 90 days to provisional
  const downgradeResult = await query<{ id: string }>(
    `UPDATE knowledge_entries
     SET confidence = 'provisional'
     WHERE confidence = 'active'
       AND last_verified_at < NOW() - INTERVAL '90 days'
     RETURNING id`,
  );

  const downgraded = downgradeResult.rows.length;

  log.info('Knowledge lifecycle maintenance complete', {
    archived,
    downgraded,
  });

  return { archived, downgraded };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the knowledge lifecycle job with the scheduler.
 */
export function registerKnowledgeLifecycleJob(): void {
  registerJob({
    name: 'knowledge-lifecycle',
    defaultCron: '0 3 * * *', // Daily at 03:00
    cronEnvVar: 'KNOWLEDGE_LIFECYCLE_CRON',
    handler: async (_job: Job) => {
      await executeKnowledgeLifecycle();
    },
  });
}
