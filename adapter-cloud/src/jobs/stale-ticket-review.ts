/**
 * Stale Ticket Review Job — Daily review of aging investigations.
 *
 * Finds investigations older than a configurable threshold, checks whether
 * their associated Jira tickets are still open, and posts reminder summaries
 * to the relevant Slack channels.
 *
 * Environment variables:
 *   STALE_TICKET_REVIEW_CRON          — Override schedule (default: daily at 08:00)
 *   STALE_TICKET_THRESHOLD_DAYS       — Days before an investigation is stale (default: 7)
 *   STALE_TICKET_SLACK_CHANNEL        — Default Slack channel for stale ticket alerts
 *   STALE_TICKET_MAX_RESULTS          — Max stale tickets to process per run (default: 50)
 */

import type { Job } from 'bullmq';
import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';
import { Counter, Gauge } from 'prom-client';
import { register } from '../observability/metrics.js';
import { registerJob } from './scheduler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StaleInvestigation {
  id: string;
  ticket_id: string;
  domain: string;
  status: string;
  trigger_source: string;
  created_at: Date;
  updated_at: Date;
  age_days: number;
}

export interface JiraTicketStatus {
  ticket_id: string;
  is_open: boolean;
  status: string;
}

export interface StaleTicketReviewResult {
  timestamp: string;
  staleCount: number;
  openTicketCount: number;
  notifiedChannels: string[];
  investigations: StaleInvestigationReport[];
}

export interface StaleInvestigationReport {
  investigation_id: string;
  ticket_id: string;
  domain: string;
  age_days: number;
  jira_status: string;
  jira_open: boolean;
}

/**
 * Interface for Jira client used by the stale ticket review.
 * Abstracted for testability — the real implementation calls the
 * Jira MCP server or REST API.
 */
export interface JiraClient {
  getTicketStatus(ticketId: string): Promise<JiraTicketStatus>;
}

/**
 * Interface for Slack notifier used by the stale ticket review.
 * Abstracted for testability.
 */
export interface SlackNotifier {
  postMessage(channel: string, text: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Gauge tracking current number of stale investigations. */
export const pmStaleInvestigationsGauge = new Gauge({
  name: 'pm_stale_investigations',
  help: 'Current number of stale investigations',
  registers: [register],
});

/** Counter for stale ticket review runs. */
export const pmStaleReviewRunsTotal = new Counter({
  name: 'pm_stale_review_runs_total',
  help: 'Total stale ticket review executions',
  labelNames: ['result'] as const,
  registers: [register],
});

/** Counter for Slack notifications sent by the stale review. */
export const pmStaleReviewNotificationsTotal = new Counter({
  name: 'pm_stale_review_notifications_total',
  help: 'Total Slack notifications sent for stale tickets',
  registers: [register],
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('jobs:stale-ticket-review');

const DEFAULT_THRESHOLD_DAYS = 7;
const DEFAULT_MAX_RESULTS = 50;

// ---------------------------------------------------------------------------
// Dependencies (set via setters for testability)
// ---------------------------------------------------------------------------

let jiraClientRef: JiraClient | undefined;
let slackNotifierRef: SlackNotifier | undefined;

/**
 * Set the Jira client used to check ticket status.
 */
export function setJiraClient(client: JiraClient): void {
  jiraClientRef = client;
}

/**
 * Set the Slack notifier used to post stale ticket summaries.
 */
export function setSlackNotifier(notifier: SlackNotifier): void {
  slackNotifierRef = notifier;
}

// ---------------------------------------------------------------------------
// Job handler
// ---------------------------------------------------------------------------

/**
 * Find stale investigations from the database.
 */
export async function findStaleInvestigations(
  thresholdDays: number,
  maxResults: number,
): Promise<StaleInvestigation[]> {
  const result = await query<StaleInvestigation>(
    `SELECT
       id,
       ticket_id,
       domain,
       status,
       trigger_source,
       created_at,
       updated_at,
       EXTRACT(DAY FROM NOW() - created_at)::int AS age_days
     FROM investigations
     WHERE status NOT IN ('completed', 'failed')
       AND created_at < NOW() - INTERVAL '1 day' * $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [thresholdDays, maxResults],
  );

  return result.rows;
}

/**
 * Build a summary message for Slack.
 */
export function buildSlackSummary(
  reports: StaleInvestigationReport[],
  thresholdDays: number,
): string {
  const openReports = reports.filter((r) => r.jira_open);
  const closedReports = reports.filter((r) => !r.jira_open);

  const lines: string[] = [
    `:warning: *Stale Investigation Review* — ${reports.length} investigation(s) older than ${thresholdDays} days`,
    '',
  ];

  if (openReports.length > 0) {
    lines.push(`*${openReports.length} with open Jira tickets:*`);
    for (const r of openReports) {
      lines.push(
        `  • \`${r.ticket_id}\` (${r.domain}) — ${r.age_days}d old, Jira: _${r.jira_status}_`,
      );
    }
    lines.push('');
  }

  if (closedReports.length > 0) {
    lines.push(`*${closedReports.length} with closed/resolved Jira tickets (may need cleanup):*`);
    for (const r of closedReports) {
      lines.push(
        `  • \`${r.ticket_id}\` (${r.domain}) — ${r.age_days}d old, Jira: _${r.jira_status}_`,
      );
    }
  }

  return lines.join('\n');
}

/**
 * Execute the stale ticket review.
 *
 * 1. Query DB for investigations older than threshold
 * 2. Check Jira status for each
 * 3. Post summary to Slack
 */
export async function executeStaleTicketReview(): Promise<StaleTicketReviewResult> {
  const thresholdDays = parseInt(
    process.env.STALE_TICKET_THRESHOLD_DAYS ?? String(DEFAULT_THRESHOLD_DAYS),
    10,
  );
  const maxResults = parseInt(
    process.env.STALE_TICKET_MAX_RESULTS ?? String(DEFAULT_MAX_RESULTS),
    10,
  );
  const defaultChannel = process.env.STALE_TICKET_SLACK_CHANNEL ?? '#production-master-alerts';

  // 1. Find stale investigations
  const staleInvestigations = await findStaleInvestigations(thresholdDays, maxResults);

  pmStaleInvestigationsGauge.set(staleInvestigations.length);

  if (staleInvestigations.length === 0) {
    pmStaleReviewRunsTotal.inc({ result: 'clean' });
    log.info('Stale ticket review: no stale investigations found', { thresholdDays });
    return {
      timestamp: new Date().toISOString(),
      staleCount: 0,
      openTicketCount: 0,
      notifiedChannels: [],
      investigations: [],
    };
  }

  log.info('Stale ticket review: found stale investigations', {
    count: staleInvestigations.length,
    thresholdDays,
  });

  // 2. Check Jira ticket status for each stale investigation
  const reports: StaleInvestigationReport[] = [];

  for (const inv of staleInvestigations) {
    let jiraStatus = 'unknown';
    let jiraOpen = true; // Default to open if we cannot check

    if (jiraClientRef) {
      try {
        const ticketStatus = await jiraClientRef.getTicketStatus(inv.ticket_id);
        jiraStatus = ticketStatus.status;
        jiraOpen = ticketStatus.is_open;
      } catch (err) {
        log.warn('Failed to fetch Jira status for stale ticket', {
          ticket_id: inv.ticket_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      log.debug('No Jira client configured — assuming ticket is open', {
        ticket_id: inv.ticket_id,
      });
    }

    reports.push({
      investigation_id: inv.id,
      ticket_id: inv.ticket_id,
      domain: inv.domain,
      age_days: inv.age_days,
      jira_status: jiraStatus,
      jira_open: jiraOpen,
    });
  }

  const openTicketCount = reports.filter((r) => r.jira_open).length;

  // 3. Post summary to Slack
  const notifiedChannels: string[] = [];

  if (slackNotifierRef) {
    const summary = buildSlackSummary(reports, thresholdDays);

    // Group by domain and post to domain-specific channels if configured
    const domainGroups = new Map<string, StaleInvestigationReport[]>();
    for (const report of reports) {
      const domain = report.domain || 'unknown';
      const group = domainGroups.get(domain) ?? [];
      group.push(report);
      domainGroups.set(domain, group);
    }

    // Post summary to the default channel
    try {
      await slackNotifierRef.postMessage(defaultChannel, summary);
      notifiedChannels.push(defaultChannel);
      pmStaleReviewNotificationsTotal.inc();

      log.info('Posted stale ticket summary to Slack', {
        channel: defaultChannel,
        stale_count: reports.length,
        open_count: openTicketCount,
      });
    } catch (err) {
      log.error('Failed to post stale ticket summary to Slack', {
        channel: defaultChannel,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    log.warn('No Slack notifier configured — stale ticket summary not posted');
  }

  pmStaleReviewRunsTotal.inc({ result: openTicketCount > 0 ? 'stale_found' : 'clean' });

  return {
    timestamp: new Date().toISOString(),
    staleCount: staleInvestigations.length,
    openTicketCount,
    notifiedChannels,
    investigations: reports,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the stale ticket review job with the scheduler.
 */
export function registerStaleTicketReviewJob(): void {
  registerJob({
    name: 'stale-ticket-review',
    defaultCron: '0 8 * * *', // Daily at 08:00
    cronEnvVar: 'STALE_TICKET_REVIEW_CRON',
    handler: async (_job: Job) => {
      await executeStaleTicketReview();
    },
  });
}
