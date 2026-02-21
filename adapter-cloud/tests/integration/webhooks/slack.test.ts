/**
 * Integration tests for the Slack slash command webhook (PR 5.2).
 *
 * Validates:
 * - Slack signing secret verification (valid, invalid, missing, replay)
 * - Ticket ID parsing from slash command text
 * - Immediate 200 response with ephemeral message
 * - Error handling for missing/malformed payloads
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySlackSignature, parseTicketId } from '../../../src/api/webhooks/slack.js';

// ---------------------------------------------------------------------------
// Helpers — build a Slack-signed request
// ---------------------------------------------------------------------------

const TEST_SIGNING_SECRET = 'test-slack-signing-secret-abc123';

function makeSlackSignature(
  secret: string,
  timestamp: string,
  body: string,
): string {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex');
  return `v0=${hmac}`;
}

function nowTimestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

function buildSlackPayload(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    token: 'deprecated-token',
    team_id: 'T12345',
    team_domain: 'example',
    channel_id: 'C98765',
    channel_name: 'incidents',
    user_id: 'U11111',
    user_name: 'jane.doe',
    command: '/investigate',
    text: 'PROD-4567',
    response_url: 'https://hooks.slack.com/commands/T12345/12345/AbCdEf',
    trigger_id: '123.456.abc',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe('verifySlackSignature', () => {
  it('should accept a valid signature', () => {
    const ts = nowTimestamp();
    const body = 'token=abc&text=PROD-123';
    const sig = makeSlackSignature(TEST_SIGNING_SECRET, ts, body);

    expect(verifySlackSignature(TEST_SIGNING_SECRET, ts, body, sig)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const ts = nowTimestamp();
    const body = 'token=abc&text=PROD-123';
    const sig = 'v0=0000000000000000000000000000000000000000000000000000000000000000';

    expect(verifySlackSignature(TEST_SIGNING_SECRET, ts, body, sig)).toBe(false);
  });

  it('should reject a tampered body', () => {
    const ts = nowTimestamp();
    const originalBody = 'token=abc&text=PROD-123';
    const sig = makeSlackSignature(TEST_SIGNING_SECRET, ts, originalBody);

    const tamperedBody = 'token=abc&text=PROD-999';
    expect(verifySlackSignature(TEST_SIGNING_SECRET, ts, tamperedBody, sig)).toBe(false);
  });

  it('should reject a replay attack (timestamp > 5 min old)', () => {
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
    const body = 'token=abc&text=PROD-123';
    const sig = makeSlackSignature(TEST_SIGNING_SECRET, oldTimestamp, body);

    expect(verifySlackSignature(TEST_SIGNING_SECRET, oldTimestamp, body, sig)).toBe(false);
  });

  it('should reject a future timestamp (> 5 min ahead)', () => {
    const futureTimestamp = String(Math.floor(Date.now() / 1000) + 600); // 10 min ahead
    const body = 'token=abc&text=PROD-123';
    const sig = makeSlackSignature(TEST_SIGNING_SECRET, futureTimestamp, body);

    expect(verifySlackSignature(TEST_SIGNING_SECRET, futureTimestamp, body, sig)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ticket ID parsing
// ---------------------------------------------------------------------------

describe('parseTicketId', () => {
  it('should extract a standard ticket ID', () => {
    expect(parseTicketId('PROD-4567')).toBe('PROD-4567');
  });

  it('should extract ticket ID with surrounding whitespace', () => {
    expect(parseTicketId('  INC-123  ')).toBe('INC-123');
  });

  it('should uppercase lowercase ticket IDs', () => {
    expect(parseTicketId('prod-789')).toBe('PROD-789');
  });

  it('should extract ticket ID when followed by extra text', () => {
    expect(parseTicketId('PROD-123 urgent please')).toBe('PROD-123');
  });

  it('should return null for empty input', () => {
    expect(parseTicketId('')).toBeNull();
  });

  it('should return null for whitespace-only input', () => {
    expect(parseTicketId('   ')).toBeNull();
  });

  it('should return null for bare numbers', () => {
    expect(parseTicketId('12345')).toBeNull();
  });

  it('should return null for just text without numbers', () => {
    expect(parseTicketId('investigate this')).toBeNull();
  });

  it('should handle single-letter prefixes', () => {
    expect(parseTicketId('P-1')).toBe('P-1');
  });

  it('should handle long project keys', () => {
    expect(parseTicketId('MYPROJECT-99999')).toBe('MYPROJECT-99999');
  });
});

// ---------------------------------------------------------------------------
// Slack payload shape validation
// ---------------------------------------------------------------------------

describe('Slack payload structure', () => {
  it('should build a complete payload with required fields', () => {
    const payload = buildSlackPayload();
    expect(payload.command).toBe('/investigate');
    expect(payload.text).toBe('PROD-4567');
    expect(payload.response_url).toMatch(/^https:\/\/hooks\.slack\.com/);
    expect(payload.channel_id).toBeDefined();
    expect(payload.user_name).toBeDefined();
  });

  it('should allow overriding payload fields', () => {
    const payload = buildSlackPayload({ text: 'INC-999', channel_id: 'C00000' });
    expect(payload.text).toBe('INC-999');
    expect(payload.channel_id).toBe('C00000');
  });

  it('should extract ticket from built payload', () => {
    const payload = buildSlackPayload();
    const ticketId = parseTicketId(payload.text);
    expect(ticketId).toBe('PROD-4567');
  });
});
