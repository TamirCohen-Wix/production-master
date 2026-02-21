/**
 * Query endpoints — ad-hoc queries against MCP data sources:
 *   POST /api/v1/query/logs     — query logs/observability
 *   POST /api/v1/query/slack    — query Slack messages
 *   POST /api/v1/query/changes  — query code changes
 */

import { Router } from 'express';
import { queryRateLimit } from '../middleware/rate-limit.js';
import {
  validateBody,
  queryLogsSchema,
  querySlackSchema,
  queryChangesSchema,
  type QueryLogsBody,
  type QuerySlackBody,
  type QueryChangesBody,
} from '../middleware/validation.js';
import { McpRegistry } from '../../mcp/registry.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:queries');

// The registry instance is injected via factory function
let registry: McpRegistry | undefined;

/**
 * Set the MCP registry used for query routing.
 * Must be called once during server startup.
 */
export function setQueryRegistry(r: McpRegistry): void {
  registry = r;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const queriesRouter = Router();

// --- POST /logs ---
queriesRouter.post(
  '/logs',
  queryRateLimit,
  validateBody(queryLogsSchema),
  async (req, res) => {
    const body = req.body as QueryLogsBody;

    try {
      if (!registry) {
        res.status(503).json({ error: 'MCP registry not initialized' });
        return;
      }

      const client = await registry.getClient('grafana-datasource');
      const result = await client.callTool('query_logs', {
        query: body.query,
        service: body.service,
        time_range: body.time_range,
        limit: body.limit,
      });

      log.info('Log query executed', { query: body.query, service: body.service });
      res.json({ results: result.content });
    } catch (err) {
      log.error('Log query failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'Query execution failed' });
    }
  },
);

// --- POST /slack ---
queriesRouter.post(
  '/slack',
  queryRateLimit,
  validateBody(querySlackSchema),
  async (req, res) => {
    const body = req.body as QuerySlackBody;

    try {
      if (!registry) {
        res.status(503).json({ error: 'MCP registry not initialized' });
        return;
      }

      const client = await registry.getClient('slack');
      const result = await client.callTool('search_messages', {
        query: body.query,
        channel: body.channel,
        limit: body.limit,
      });

      log.info('Slack query executed', { query: body.query, channel: body.channel });
      res.json({ results: result.content });
    } catch (err) {
      log.error('Slack query failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'Query execution failed' });
    }
  },
);

// --- POST /changes ---
queriesRouter.post(
  '/changes',
  queryRateLimit,
  validateBody(queryChangesSchema),
  async (req, res) => {
    const body = req.body as QueryChangesBody;

    try {
      if (!registry) {
        res.status(503).json({ error: 'MCP registry not initialized' });
        return;
      }

      const client = await registry.getClient('github');
      const result = await client.callTool('search_changes', {
        query: body.query,
        repo: body.repo,
        since: body.since,
        limit: body.limit,
      });

      log.info('Changes query executed', { query: body.query, repo: body.repo });
      res.json({ results: result.content });
    } catch (err) {
      log.error('Changes query failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: 'Query execution failed' });
    }
  },
);
