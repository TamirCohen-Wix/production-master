/**
 * Unit tests for the stale ticket review scheduled job.
 *
 * Mocks the database, Jira client, and Slack notifier to test the
 * full review pipeline: finding stale investigations, checking Jira
 * status, and posting Slack summaries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock('../../../src/storage/db.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue(undefined),
    upsertJobScheduler: vi.fn().mockResolvedValue({}),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

vi.mock('../../../src/observability/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockGaugeSet = vi.fn();
const mockCounterInc = vi.fn();

vi.mock('prom-client', () => ({
  Gauge: vi.fn().mockImplementation(() => ({
    set: mockGaugeSet,
  })),
  Counter: vi.fn().mockImplementation(() => ({
    inc: mockCounterInc,
  })),
}));

vi.mock('../../../src/observability/metrics.js', () => ({
  register: {
    registerMetric: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  executeStaleTicketReview,
  findStaleInvestigations,
  buildSlackSummary,
  setJiraClient,
  setSlackNotifier,
  registerStaleTicketReviewJob,
  type JiraClient,
  type SlackNotifier,
  type StaleInvestigationReport,
} from '../../../src/jobs/stale-ticket-review.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockJiraClient(
  statuses: Record<string, { is_open: boolean; status: string }>,
): JiraClient {
  return {
    getTicketStatus: vi.fn().mockImplementation(async (ticketId: string) => {
      const status = statuses[ticketId];
      if (!status) {
        return { ticket_id: ticketId, is_open: true, status: 'Unknown' };
      }
      return { ticket_id: ticketId, ...status };
    }),
  };
}

function createMockSlackNotifier(): SlackNotifier & { postMessage: ReturnType<typeof vi.fn> } {
  return {
    postMessage: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stale Ticket Review Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STALE_TICKET_THRESHOLD_DAYS;
    delete process.env.STALE_TICKET_MAX_RESULTS;
    delete process.env.STALE_TICKET_SLACK_CHANNEL;
    // Reset clients
    setJiraClient(undefined as unknown as JiraClient);
    setSlackNotifier(undefined as unknown as SlackNotifier);
  });

  describe('findStaleInvestigations', () => {
    it('should query the database with correct threshold and limit', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await findStaleInvestigations(7, 50);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('investigations');
      expect(sql).toContain("status NOT IN ('completed', 'failed')");
      expect(params).toEqual([7, 50]);
    });

    it('should return stale investigations from database', async () => {
      const now = new Date();
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(now.getTime() - 10 * 86400000),
            updated_at: new Date(now.getTime() - 5 * 86400000),
            age_days: 10,
          },
          {
            id: 'inv-2',
            ticket_id: 'PROD-200',
            domain: 'auth',
            status: 'queued',
            trigger_source: 'slack_command',
            created_at: new Date(now.getTime() - 8 * 86400000),
            updated_at: new Date(now.getTime() - 8 * 86400000),
            age_days: 8,
          },
        ],
      });

      const result = await findStaleInvestigations(7, 50);
      expect(result).toHaveLength(2);
      expect(result[0].ticket_id).toBe('PROD-100');
      expect(result[1].ticket_id).toBe('PROD-200');
    });
  });

  describe('buildSlackSummary', () => {
    it('should build a summary with open and closed tickets', () => {
      const reports: StaleInvestigationReport[] = [
        {
          investigation_id: 'inv-1',
          ticket_id: 'PROD-100',
          domain: 'payments',
          age_days: 10,
          jira_status: 'In Progress',
          jira_open: true,
        },
        {
          investigation_id: 'inv-2',
          ticket_id: 'PROD-200',
          domain: 'auth',
          age_days: 8,
          jira_status: 'Resolved',
          jira_open: false,
        },
      ];

      const summary = buildSlackSummary(reports, 7);

      expect(summary).toContain('Stale Investigation Review');
      expect(summary).toContain('2 investigation(s) older than 7 days');
      expect(summary).toContain('PROD-100');
      expect(summary).toContain('PROD-200');
      expect(summary).toContain('open Jira tickets');
      expect(summary).toContain('closed/resolved');
      expect(summary).toContain('In Progress');
      expect(summary).toContain('Resolved');
    });

    it('should handle all-open tickets', () => {
      const reports: StaleInvestigationReport[] = [
        {
          investigation_id: 'inv-1',
          ticket_id: 'PROD-100',
          domain: 'payments',
          age_days: 14,
          jira_status: 'Open',
          jira_open: true,
        },
      ];

      const summary = buildSlackSummary(reports, 7);

      expect(summary).toContain('1 with open Jira tickets');
      expect(summary).not.toContain('closed/resolved');
    });

    it('should handle all-closed tickets', () => {
      const reports: StaleInvestigationReport[] = [
        {
          investigation_id: 'inv-1',
          ticket_id: 'PROD-100',
          domain: 'payments',
          age_days: 14,
          jira_status: 'Done',
          jira_open: false,
        },
      ];

      const summary = buildSlackSummary(reports, 7);

      expect(summary).not.toContain('open Jira tickets');
      expect(summary).toContain('closed/resolved');
    });
  });

  describe('executeStaleTicketReview', () => {
    it('should return clean result when no stale investigations exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await executeStaleTicketReview();

      expect(result.staleCount).toBe(0);
      expect(result.openTicketCount).toBe(0);
      expect(result.notifiedChannels).toEqual([]);
      expect(result.investigations).toEqual([]);
    });

    it('should check Jira status for stale investigations', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
        ],
      });

      const jiraClient = createMockJiraClient({
        'PROD-100': { is_open: true, status: 'In Progress' },
      });
      setJiraClient(jiraClient);

      const result = await executeStaleTicketReview();

      expect(jiraClient.getTicketStatus).toHaveBeenCalledWith('PROD-100');
      expect(result.staleCount).toBe(1);
      expect(result.investigations[0].jira_status).toBe('In Progress');
      expect(result.investigations[0].jira_open).toBe(true);
    });

    it('should post summary to Slack when notifier is configured', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
        ],
      });

      const slackNotifier = createMockSlackNotifier();
      setSlackNotifier(slackNotifier);

      const result = await executeStaleTicketReview();

      expect(slackNotifier.postMessage).toHaveBeenCalledTimes(1);
      // Default channel
      expect(slackNotifier.postMessage.mock.calls[0][0]).toBe('#production-master-alerts');
      expect(result.notifiedChannels).toContain('#production-master-alerts');
    });

    it('should use custom Slack channel from env var', async () => {
      process.env.STALE_TICKET_SLACK_CHANNEL = '#custom-alerts';

      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
        ],
      });

      const slackNotifier = createMockSlackNotifier();
      setSlackNotifier(slackNotifier);

      const result = await executeStaleTicketReview();

      expect(slackNotifier.postMessage.mock.calls[0][0]).toBe('#custom-alerts');
      expect(result.notifiedChannels).toContain('#custom-alerts');
    });

    it('should handle Jira client errors gracefully', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
        ],
      });

      const jiraClient: JiraClient = {
        getTicketStatus: vi.fn().mockRejectedValue(new Error('Jira unavailable')),
      };
      setJiraClient(jiraClient);

      // Should not throw — falls back to assuming ticket is open
      const result = await executeStaleTicketReview();

      expect(result.investigations[0].jira_status).toBe('unknown');
      expect(result.investigations[0].jira_open).toBe(true);
    });

    it('should handle Slack notifier errors gracefully', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
        ],
      });

      const slackNotifier: SlackNotifier = {
        postMessage: vi.fn().mockRejectedValue(new Error('Slack API error')),
      };
      setSlackNotifier(slackNotifier);

      // Should not throw
      const result = await executeStaleTicketReview();

      expect(result.staleCount).toBe(1);
      // Channel notification failed, so not in the list
      expect(result.notifiedChannels).toEqual([]);
    });

    it('should use configurable threshold days', async () => {
      process.env.STALE_TICKET_THRESHOLD_DAYS = '14';

      mockQuery.mockResolvedValue({ rows: [] });

      await executeStaleTicketReview();

      const [, params] = mockQuery.mock.calls[0];
      expect(params[0]).toBe(14);
    });

    it('should update stale investigations gauge metric', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          {
            id: 'inv-1',
            ticket_id: 'PROD-100',
            domain: 'payments',
            status: 'running',
            trigger_source: 'webhook',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 10,
          },
          {
            id: 'inv-2',
            ticket_id: 'PROD-200',
            domain: 'auth',
            status: 'queued',
            trigger_source: 'slack_command',
            created_at: new Date(),
            updated_at: new Date(),
            age_days: 8,
          },
        ],
      });

      await executeStaleTicketReview();

      expect(mockGaugeSet).toHaveBeenCalledWith(2);
    });
  });

  describe('registerStaleTicketReviewJob', () => {
    it('should register without throwing', () => {
      expect(() => registerStaleTicketReviewJob()).not.toThrow();
    });
  });
});
