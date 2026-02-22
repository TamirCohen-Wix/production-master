/**
 * POST /api/v1/webhooks/slack
 *
 * Receives Slack slash command payloads (e.g. `/investigate TICKET-123`),
 * verifies the request signature using SLACK_SIGNING_SECRET, parses the
 * ticket ID, responds immediately with an ephemeral acknowledgement, and
 * enqueues the investigation with trigger_source: "slack_command".
 *
 * Slack slash commands require a 200 response within 3 seconds — we respond
 * immediately and do all heavy lifting asynchronously via BullMQ.
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';
import { getQueue } from '../../queues/index.js';
import { getSlackSigningSecret } from '../../config/wix-config.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:webhooks:slack');

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

/**
 * Verify the Slack request signature (v0) using the signing secret.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
): boolean {
  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex');
  const expectedSignature = `v0=${hmac}`;

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

// ---------------------------------------------------------------------------
// Ticket ID parser
// ---------------------------------------------------------------------------

/**
 * Extract a ticket ID from the slash command text.
 * Accepts formats: TICKET-123, ticket-123, ABC-456, PROJ-1
 */
export function parseTicketId(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^([A-Za-z]+-\d+)/);
  return match ? match[1].toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const slackWebhookRouter = Router();

/**
 * Slack sends slash command payloads as application/x-www-form-urlencoded.
 * We need the raw body for signature verification, so we use a custom
 * middleware that captures it before URL-decoding.
 */
slackWebhookRouter.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    // --- Verify signing secret is configured ---
    const signingSecret = getSlackSigningSecret();
    if (!signingSecret) {
      log.error('SLACK_SIGNING_SECRET is not configured');
      res.status(500).json({ error: 'Slack integration not configured' });
      return;
    }

    // --- Verify Slack signature ---
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const slackSignature = req.headers['x-slack-signature'] as string;

    if (!timestamp || !slackSignature) {
      res.status(400).json({ error: 'Missing Slack signature headers' });
      return;
    }

    // Reconstruct raw body from parsed form data for verification
    const rawBody = (req as Request & { rawBody?: string }).rawBody
      ?? new URLSearchParams(req.body as Record<string, string>).toString();

    if (!verifySlackSignature(signingSecret, timestamp, rawBody, slackSignature)) {
      log.warn('Invalid Slack signature', { timestamp });
      res.status(401).json({ error: 'Invalid request signature' });
      return;
    }

    // --- Parse slash command payload ---
    const {
      text,
      response_url,
      channel_id,
      channel_name,
      user_id,
      user_name,
      command,
    } = req.body as Record<string, string>;

    log.info('Slack slash command received', {
      command,
      text,
      channel_id,
      user_name,
    });

    // --- Extract ticket ID ---
    const ticketId = parseTicketId(text ?? '');
    if (!ticketId) {
      res.status(200).json({
        response_type: 'ephemeral',
        text: `Usage: ${command ?? '/investigate'} TICKET-123\nPlease provide a valid ticket ID (e.g. PROD-456, INC-789).`,
      });
      return;
    }

    try {
      // --- Deduplication: check for active investigation ---
      const existing = await query<{ id: string; status: string }>(
        `SELECT id, status FROM investigations
         WHERE ticket_id = $1 AND status NOT IN ('completed', 'failed')
         LIMIT 1`,
        [ticketId],
      );

      if (existing.rows.length > 0) {
        const inv = existing.rows[0];
        res.status(200).json({
          response_type: 'ephemeral',
          text: `:mag: Investigation for *${ticketId}* is already ${inv.status} (ID: \`${inv.id}\`).`,
        });
        return;
      }

      // --- Create DB record with Slack metadata ---
      const insertResult = await query<{ id: string }>(
        `INSERT INTO investigations
           (ticket_id, mode, trigger_source, requested_by, status, metadata)
         VALUES ($1, 'balanced', 'slack_command', $2, 'queued', $3)
         RETURNING id`,
        [
          ticketId,
          user_name ?? user_id ?? 'slack-user',
          JSON.stringify({
            response_url,
            channel_id,
            channel_name,
            user_id,
            user_name,
            command,
          }),
        ],
      );

      const investigationId = insertResult.rows[0].id;

      // --- Enqueue to BullMQ ---
      await getQueue('investigations').add(
        'investigate',
        {
          investigation_id: investigationId,
          ticket_id: ticketId,
          mode: 'balanced',
          trigger_source: 'slack_command',
          requested_by: user_name ?? user_id ?? 'slack-user',
          slack: {
            response_url,
            channel_id,
            channel_name,
            user_id,
            user_name,
          },
        },
        {
          jobId: investigationId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );

      // --- Metrics ---
      pmInvestigationTotal.inc({ domain: 'unknown', status: 'queued', trigger_source: 'slack_command' });

      log.info('Investigation queued from Slack', {
        investigation_id: investigationId,
        ticket_id: ticketId,
        channel_id,
        user_name,
      });

      // --- Respond immediately with ephemeral message ---
      res.status(200).json({
        response_type: 'ephemeral',
        text: `:rocket: Investigation started for *${ticketId}* (ID: \`${investigationId}\`).\nI'll post results here when done.`,
      });
    } catch (err) {
      log.error('Failed to process Slack command', {
        error: err instanceof Error ? err.message : String(err),
        ticket_id: ticketId,
      });
      res.status(200).json({
        response_type: 'ephemeral',
        text: `:warning: Something went wrong starting the investigation for *${ticketId}*. Please try again.`,
      });
    }
  },
);

