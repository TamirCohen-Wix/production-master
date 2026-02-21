/**
 * Domain configuration CRUD endpoints:
 *   GET    /api/v1/domains         — list all domains
 *   GET    /api/v1/domains/:id     — get single domain
 *   POST   /api/v1/domains         — create domain
 *   PUT    /api/v1/domains/:id     — update domain
 *   DELETE /api/v1/domains/:id     — delete domain
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { validateBody, domainConfigSchema, type DomainConfigBody } from '../middleware/validation.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:domains');

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const domainsRouter = Router();

// --- GET / — list all domains ---
domainsRouter.get('/', queryRateLimit, async (_req, res) => {
  try {
    const result = await query(
      'SELECT id, name, description, services, mcp_servers, settings, created_at, updated_at FROM domain_configs ORDER BY name',
    );
    res.json({ data: result.rows });
  } catch (err) {
    log.error('Failed to list domains', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /:id — single domain ---
domainsRouter.get('/:id', queryRateLimit, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, description, services, mcp_servers, settings, created_at, updated_at FROM domain_configs WHERE id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Domain not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    log.error('Failed to fetch domain', {
      error: err instanceof Error ? err.message : String(err),
      domain_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST / — create domain ---
domainsRouter.post('/', queryRateLimit, validateBody(domainConfigSchema), async (req, res) => {
  const body = req.body as DomainConfigBody;

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO domain_configs (name, description, services, mcp_servers, settings)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [body.name, body.description ?? null, JSON.stringify(body.services), JSON.stringify(body.mcp_servers), JSON.stringify(body.settings)],
    );

    log.info('Domain created', { domain_id: result.rows[0].id, name: body.name });
    res.status(201).json({ id: result.rows[0].id, ...body });
  } catch (err) {
    log.error('Failed to create domain', {
      error: err instanceof Error ? err.message : String(err),
      name: body.name,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PUT /:id — update domain ---
domainsRouter.put('/:id', queryRateLimit, validateBody(domainConfigSchema), async (req, res) => {
  const body = req.body as DomainConfigBody;

  try {
    const result = await query(
      `UPDATE domain_configs
       SET name = $1, description = $2, services = $3, mcp_servers = $4, settings = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id`,
      [body.name, body.description ?? null, JSON.stringify(body.services), JSON.stringify(body.mcp_servers), JSON.stringify(body.settings), req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Domain not found' });
      return;
    }

    log.info('Domain updated', { domain_id: req.params.id, name: body.name });
    res.json({ id: req.params.id, ...body });
  } catch (err) {
    log.error('Failed to update domain', {
      error: err instanceof Error ? err.message : String(err),
      domain_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- DELETE /:id — delete domain ---
domainsRouter.delete('/:id', queryRateLimit, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM domain_configs WHERE id = $1 RETURNING id',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Domain not found' });
      return;
    }

    log.info('Domain deleted', { domain_id: req.params.id });
    res.status(204).send();
  } catch (err) {
    log.error('Failed to delete domain', {
      error: err instanceof Error ? err.message : String(err),
      domain_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
