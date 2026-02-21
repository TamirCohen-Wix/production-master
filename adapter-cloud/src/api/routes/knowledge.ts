/**
 * Knowledge routes:
 *   GET  /api/v1/knowledge                    — list knowledge entries (paginated)
 *   GET  /api/v1/knowledge/export/:service    — export active entries for a service
 *   GET  /api/v1/knowledge/:id                — single knowledge entry
 *   POST /api/v1/knowledge/:id/verify         — mark entry as verified
 *   POST /api/v1/knowledge/:id/archive        — archive an entry
 */

import { Router } from 'express';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';
import * as KnowledgeEntryModel from '../../storage/models/knowledge-entry.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:knowledge');

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const knowledgeRouter = Router();

// --- GET / — list knowledge entries with pagination ---
knowledgeRouter.get('/', queryRateLimit, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const filters: { service?: string; category?: string; confidence?: string } = {};
    if (req.query.service) filters.service = req.query.service as string;
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.confidence) filters.confidence = req.query.confidence as string;

    const { data, total } = await KnowledgeEntryModel.list(filters, limit, offset);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    log.error('Failed to list knowledge entries', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /export/:service — export active entries for a service ---
knowledgeRouter.get('/export/:service', queryRateLimit, async (req, res) => {
  try {
    const entries = await KnowledgeEntryModel.exportByService(req.params.service as string);
    res.json({ service: req.params.service, entries, count: entries.length });
  } catch (err) {
    log.error('Failed to export knowledge entries', {
      error: err instanceof Error ? err.message : String(err),
      service: req.params.service,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /:id — single knowledge entry ---
knowledgeRouter.get('/:id', queryRateLimit, async (req, res) => {
  try {
    const entry = await KnowledgeEntryModel.getById(req.params.id as string);

    if (!entry) {
      res.status(404).json({ error: 'Knowledge entry not found' });
      return;
    }

    res.json(entry);
  } catch (err) {
    log.error('Failed to fetch knowledge entry', {
      error: err instanceof Error ? err.message : String(err),
      knowledge_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /:id/verify — mark entry as verified ---
knowledgeRouter.post('/:id/verify', async (req, res) => {
  try {
    const entry = await KnowledgeEntryModel.verify(req.params.id);

    if (!entry) {
      res.status(404).json({ error: 'Knowledge entry not found' });
      return;
    }

    res.json(entry);
  } catch (err) {
    log.error('Failed to verify knowledge entry', {
      error: err instanceof Error ? err.message : String(err),
      knowledge_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /:id/archive — archive an entry ---
knowledgeRouter.post('/:id/archive', async (req, res) => {
  try {
    const entry = await KnowledgeEntryModel.archive(req.params.id);

    if (!entry) {
      res.status(404).json({ error: 'Knowledge entry not found' });
      return;
    }

    res.json(entry);
  } catch (err) {
    log.error('Failed to archive knowledge entry', {
      error: err instanceof Error ? err.message : String(err),
      knowledge_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
