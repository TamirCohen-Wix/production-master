/**
 * Meta-analysis routes:
 *   GET  /api/v1/meta/recommendations        — list pending recommendations (paginated)
 *   GET  /api/v1/meta/recommendations/:id     — single recommendation details
 *   POST /api/v1/meta/recommendations/:id/approve — approve a recommendation
 *   POST /api/v1/meta/recommendations/:id/reject  — reject a recommendation
 *   POST /api/v1/meta/analyze                 — trigger on-demand meta-analysis
 */

import { Router } from 'express';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';
import * as RecommendationModel from '../../storage/models/recommendation.js';
import { runMetaAnalysis } from '../../workers/meta-analysis.js';
import { applyRecommendation } from '../../workers/knowledge-applier.js';
import type { McpRegistry } from '../../workers/tool-handler.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:meta');

let _mcpRegistry: McpRegistry | null = null;

/** Inject the MCP registry for the on-demand analyze endpoint. */
export function setMetaRegistry(registry: McpRegistry): void {
  _mcpRegistry = registry;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const metaRouter = Router();

// --- GET /recommendations — list recommendations with pagination ---
metaRouter.get('/recommendations', queryRateLimit, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || 'pending';

    const { data, total } = await RecommendationModel.list({ status }, limit, offset);

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
    log.error('Failed to list recommendations', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /recommendations/:id — single recommendation ---
metaRouter.get('/recommendations/:id', queryRateLimit, async (req, res) => {
  try {
    const recommendation = await RecommendationModel.getById(req.params.id as string);

    if (!recommendation) {
      res.status(404).json({ error: 'Recommendation not found' });
      return;
    }

    res.json(recommendation);
  } catch (err) {
    log.error('Failed to fetch recommendation', {
      error: err instanceof Error ? err.message : String(err),
      recommendation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /recommendations/:id/approve — approve a recommendation ---
metaRouter.post('/recommendations/:id/approve', async (req, res) => {
  try {
    const { reviewer, note } = req.body as { reviewer?: string; note?: string };

    if (!reviewer) {
      res.status(400).json({ error: 'reviewer is required' });
      return;
    }

    const recommendation = await RecommendationModel.approve(req.params.id, reviewer, note);

    if (!recommendation) {
      // Check if it exists at all
      const existing = await RecommendationModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }
      res.status(409).json({
        error: 'Recommendation cannot be approved',
        current_status: existing.status,
      });
      return;
    }

    res.json(recommendation);
  } catch (err) {
    log.error('Failed to approve recommendation', {
      error: err instanceof Error ? err.message : String(err),
      recommendation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /recommendations/:id/reject — reject a recommendation ---
metaRouter.post('/recommendations/:id/reject', async (req, res) => {
  try {
    const { reviewer, note } = req.body as { reviewer?: string; note?: string };

    if (!reviewer) {
      res.status(400).json({ error: 'reviewer is required' });
      return;
    }
    if (!note) {
      res.status(400).json({ error: 'note is required when rejecting' });
      return;
    }

    const recommendation = await RecommendationModel.reject(req.params.id, reviewer, note);

    if (!recommendation) {
      const existing = await RecommendationModel.getById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Recommendation not found' });
        return;
      }
      res.status(409).json({
        error: 'Recommendation cannot be rejected',
        current_status: existing.status,
      });
      return;
    }

    res.json(recommendation);
  } catch (err) {
    log.error('Failed to reject recommendation', {
      error: err instanceof Error ? err.message : String(err),
      recommendation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /recommendations/:id/apply — apply an approved recommendation as knowledge ---
metaRouter.post('/recommendations/:id/apply', async (req, res) => {
  try {
    const recommendation = await RecommendationModel.getById(req.params.id);

    if (!recommendation) {
      res.status(404).json({ error: 'Recommendation not found' });
      return;
    }

    if (recommendation.status !== 'approved') {
      res.status(409).json({
        error: 'Only approved recommendations can be applied',
        current_status: recommendation.status,
      });
      return;
    }

    const knowledgeEntry = await applyRecommendation(recommendation);

    res.json({
      message: 'Recommendation applied as knowledge entry',
      knowledge_entry: knowledgeEntry,
    });
  } catch (err) {
    log.error('Failed to apply recommendation', {
      error: err instanceof Error ? err.message : String(err),
      recommendation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /analyze — trigger on-demand meta-analysis ---
metaRouter.post('/analyze', async (_req, res) => {
  try {
    if (!_mcpRegistry) {
      res.status(503).json({ error: 'MCP registry not available' });
      return;
    }

    log.info('On-demand meta-analysis triggered via API');
    const recommendations = await runMetaAnalysis(_mcpRegistry);

    res.json({
      message: 'Meta-analysis complete',
      recommendations_created: recommendations.length,
      recommendations,
    });
  } catch (err) {
    log.error('Meta-analysis failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Meta-analysis failed' });
  }
});
