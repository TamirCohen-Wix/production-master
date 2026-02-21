/**
 * Investigation read endpoints:
 *   GET /api/v1/investigations/:id         — single investigation
 *   GET /api/v1/investigations/:id/report  — investigation report
 *   GET /api/v1/investigations             — list with pagination
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';
import archiver from 'archiver';
import { getReport } from '../../storage/object-store.js';
import type { QueryResultRow } from 'pg';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:investigations');

const mcpCollectionStartedAtRaw = process.env.MCP_COLLECTION_STARTED_AT;
if (!mcpCollectionStartedAtRaw) {
  throw new Error('MCP_COLLECTION_STARTED_AT environment variable is required but was not set');
}
const mcpCollectionStartedAtMs = Date.parse(mcpCollectionStartedAtRaw);
if (Number.isNaN(mcpCollectionStartedAtMs)) {
  throw new Error(
    `MCP_COLLECTION_STARTED_AT environment variable must be a valid date string, got: "${mcpCollectionStartedAtRaw}"`,
  );
}
const MCP_COLLECTION_STARTED_AT = new Date(mcpCollectionStartedAtMs).toISOString();

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const investigationsRouter = Router();

async function safeQuery<T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T[]> {
  try {
    const result = await query<T>(sql, params);
    return result.rows;
  } catch {
    return [];
  }
}

// --- GET /:id — single investigation ---
investigationsRouter.get('/:id', queryRateLimit, async (req, res) => {
  try {
    const result = await query<{
      id: string;
      ticket_id: string;
      domain: string | null;
      mode: string;
      status: string;
      requested_by: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, ticket_id, domain, mode, status, requested_by, created_at, updated_at
       FROM investigations WHERE id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Investigation not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    log.error('Failed to fetch investigation', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /:id/report — investigation report ---
investigationsRouter.get('/:id/report', queryRateLimit, async (req, res) => {
  try {
    const result = await query<{
      id: string;
      investigation_id: string;
      verdict: string;
      confidence: number;
      summary: string;
      evidence: unknown;
      recommendations: unknown;
      created_at: string;
    }>(
      `SELECT id, investigation_id, verdict, confidence, summary, evidence, recommendations, created_at
       FROM investigation_reports WHERE investigation_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      // Check if the investigation exists at all
      const inv = await query(
        'SELECT id, status FROM investigations WHERE id = $1',
        [req.params.id],
      );

      if (inv.rows.length === 0) {
        res.status(404).json({ error: 'Investigation not found' });
        return;
      }

      res.status(404).json({
        error: 'Report not yet available',
        investigation_status: (inv.rows[0] as { status: string }).status,
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    log.error('Failed to fetch report', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /:id/bundle — download full debug bundle as zip ---
investigationsRouter.get('/:id/bundle', queryRateLimit, async (req, res) => {
  try {
    const investigationId = req.params.id as string;

    const investigations = await safeQuery<{
      id: string;
      ticket_id: string;
      domain: string | null;
      mode: string;
      status: string;
      error: string | null;
      created_at: string;
      updated_at: string;
      completed_at?: string | null;
    }>(
      `SELECT id, ticket_id, domain, mode, status, error, created_at, updated_at, completed_at
       FROM investigations WHERE id = $1`,
      [investigationId],
    );

    if (investigations.length === 0) {
      res.status(404).json({ error: 'Investigation not found' });
      return;
    }
    const investigation = investigations[0];

    const reportRows = await safeQuery<{
      summary: string;
      evidence: unknown;
      recommendations: unknown;
      created_at: string;
    }>(
      `SELECT summary, evidence, recommendations, created_at
       FROM investigation_reports
       WHERE investigation_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [investigationId],
    );

    const phaseRows = await safeQuery<{
      phase: string;
      output: string;
      duration_ms: number;
      created_at?: string;
    }>(
      `SELECT phase, output, duration_ms, created_at
       FROM investigation_phases
       WHERE investigation_id = $1
       ORDER BY created_at ASC`,
      [investigationId],
    );

    const agentRows = await safeQuery<{
      agent_name: string;
      model: string | null;
      iterations: number | null;
      token_usage: unknown;
      stop_reason: string | null;
      duration_ms: number | null;
      created_at?: string;
    }>(
      `SELECT agent_name, model, iterations, token_usage, stop_reason, duration_ms, created_at
       FROM agent_runs
       WHERE investigation_id = $1
       ORDER BY created_at ASC`,
      [investigationId],
    );

    const feedbackRows = await safeQuery<{
      rating: string;
      corrected_root_cause: string | null;
      submitted_by: string | null;
      submitted_at: string;
    }>(
      `SELECT rating, corrected_root_cause, submitted_by, submitted_at
       FROM feedback
       WHERE investigation_id = $1
       ORDER BY submitted_at ASC`,
      [investigationId],
    );

    const outputRows = await safeQuery<{
      agent_name: string;
      content: string;
      token_usage: unknown;
      iterations: number;
      stop_reason: string | null;
      created_at?: string;
    }>(
      `SELECT agent_name, content, token_usage, iterations, stop_reason, created_at
       FROM agent_outputs
       WHERE investigation_id = $1
       ORDER BY created_at ASC`,
      [investigationId],
    );

    const hypothesisRows = await safeQuery<{
      iteration: number;
      hypothesis: string;
      confidence: number;
      evidence_summary: string;
      verified: boolean;
      created_at?: string;
    }>(
      `SELECT iteration, hypothesis, confidence, evidence_summary, verified, created_at
       FROM hypothesis_iterations
       WHERE investigation_id = $1
       ORDER BY iteration ASC`,
      [investigationId],
    );

    const mcpRows = await safeQuery<{
      phase: string | null;
      agent_name: string | null;
      tool_use_id: string | null;
      server_name: string;
      tool_name: string;
      request_payload: unknown;
      response_payload: unknown;
      is_error: boolean;
      error_message: string | null;
      duration_ms: number;
      created_at?: string;
    }>(
      `SELECT phase, agent_name, tool_use_id, server_name, tool_name, request_payload, response_payload,
              is_error, error_message, duration_ms, created_at
       FROM mcp_tool_calls
       WHERE investigation_id = $1
       ORDER BY created_at ASC`,
      [investigationId],
    );

    const domainConfigRows = investigation.domain
      ? await safeQuery<{ repo: string; config: unknown; claude_md: string; updated_at?: string }>(
        `SELECT repo, config, claude_md, updated_at
         FROM domain_configs
         WHERE repo = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [investigation.domain],
      )
      : [];

    let s3Report: string | null = null;
    try {
      s3Report = await getReport(investigationId);
    } catch {
      s3Report = null;
    }

    const report = reportRows[0] ?? null;
    const hasLegacyMcpGap =
      mcpRows.length === 0 &&
      Date.parse(investigation.created_at) < Date.parse(MCP_COLLECTION_STARTED_AT);

    const mcpBundlePayload = hasLegacyMcpGap
      ? {
        status: 'not_available',
        reason: `collection_started_after_${MCP_COLLECTION_STARTED_AT}`,
      }
      : mcpRows;

    const tokenTotals = agentRows.reduce(
      (acc, row) => {
        const usage = (row.token_usage as { inputTokens?: number; outputTokens?: number; totalTokens?: number } | null) ?? {};
        acc.input += usage.inputTokens ?? 0;
        acc.output += usage.outputTokens ?? 0;
        acc.total += usage.totalTokens ?? 0;
        return acc;
      },
      { input: 0, output: 0, total: 0 },
    );

    const bundleMeta = {
      investigation,
      generated_at: new Date().toISOString(),
      report_available: Boolean(report),
      s3_report_available: Boolean(s3Report),
      phases_count: phaseRows.length,
      agents_count: agentRows.length,
      feedback_count: feedbackRows.length,
      agent_outputs_count: outputRows.length,
      hypotheses_count: hypothesisRows.length,
      mcp_tool_calls_count: Array.isArray(mcpBundlePayload) ? mcpBundlePayload.length : 0,
      mcp_collection_started_at: MCP_COLLECTION_STARTED_AT,
      token_usage: tokenTotals,
    };

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"investigation-${investigationId}-bundle.zip\"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);

    archive.append(JSON.stringify(bundleMeta, null, 2), { name: 'bundle/metadata.json' });
    archive.append(JSON.stringify(report ?? {}, null, 2), { name: 'bundle/report.json' });
    archive.append(JSON.stringify(phaseRows, null, 2), { name: 'bundle/phases.json' });
    archive.append(JSON.stringify(agentRows, null, 2), { name: 'bundle/agent-runs.json' });
    archive.append(JSON.stringify(outputRows, null, 2), { name: 'bundle/agent-outputs.json' });
    archive.append(JSON.stringify(hypothesisRows, null, 2), { name: 'bundle/hypothesis-iterations.json' });
    archive.append(JSON.stringify(mcpBundlePayload, null, 2), { name: 'bundle/mcp-tool-calls.json' });
    archive.append(JSON.stringify(feedbackRows, null, 2), { name: 'bundle/feedback.json' });
    archive.append(JSON.stringify(domainConfigRows[0] ?? {}, null, 2), { name: 'bundle/domain-config.json' });

    if (s3Report) {
      archive.append(s3Report, { name: 'bundle/report-from-object-store.html' });
    }

    const diagnostics = [
      '# Self Diagnostics',
      '',
      `- Phase count: ${phaseRows.length}`,
      `- Agent run count: ${agentRows.length}`,
      `- Feedback entries: ${feedbackRows.length}`,
      `- Input tokens: ${tokenTotals.input}`,
      `- Output tokens: ${tokenTotals.output}`,
      `- Total tokens: ${tokenTotals.total}`,
      '',
      '## Per-Agent Durations (ms)',
      ...agentRows.map((a) => `- ${a.agent_name}: ${a.duration_ms ?? 0}`),
    ].join('\n');
    archive.append(diagnostics, { name: 'bundle/self-diagnostics.md' });

    await archive.finalize();
  } catch (err) {
    log.error('Failed to build debug bundle', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET / — list investigations with pagination ---
investigationsRouter.get('/', queryRateLimit, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM investigations ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT id, ticket_id, domain, mode, status, requested_by, created_at, updated_at
       FROM investigations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    log.error('Failed to list investigations', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
