/**
 * Knowledge Applier — converts approved recommendations into knowledge entries.
 *
 * Maps recommendation types to knowledge categories:
 *   - workflow_change  → pattern
 *   - threshold_adjustment → known_issue
 *   - prompt_rewrite  → memory_update
 */

import * as KnowledgeEntryModel from '../storage/models/knowledge-entry.js';
import * as RecommendationModel from '../storage/models/recommendation.js';
import type { Recommendation } from '../storage/models/recommendation.js';
import { createLogger } from '../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('worker:knowledge-applier');

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

const TYPE_TO_CATEGORY: Record<string, KnowledgeEntryModel.KnowledgeEntry['category']> = {
  workflow_change: 'pattern',
  threshold_adjustment: 'known_issue',
  prompt_rewrite: 'memory_update',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply an approved recommendation as a knowledge entry.
 *
 * 1. Maps recommendation type → knowledge category
 * 2. Creates knowledge entry with confidence: 'active', source: 'agent'
 * 3. Marks recommendation as applied on success
 *
 * Returns the created knowledge entry.
 */
export async function applyRecommendation(
  recommendation: Recommendation,
): Promise<KnowledgeEntryModel.KnowledgeEntry> {
  const category = TYPE_TO_CATEGORY[recommendation.type] ?? 'pattern';

  log.info('Applying recommendation as knowledge entry', {
    recommendation_id: recommendation.id,
    type: recommendation.type,
    category,
    target: recommendation.target,
  });

  const entry = await KnowledgeEntryModel.create({
    service: recommendation.target,
    category,
    title: `${recommendation.type}: ${recommendation.target}`,
    content: {
      current_value: recommendation.current_value,
      proposed_value: recommendation.proposed_value,
      rationale: recommendation.rationale,
      expected_impact: recommendation.expected_impact,
    },
    confidence: 'active',
    source: 'agent',
    source_recommendation_id: recommendation.id,
  });

  // Mark recommendation as applied
  await RecommendationModel.markApplied(recommendation.id);

  log.info('Knowledge entry created from recommendation', {
    knowledge_id: entry.id,
    recommendation_id: recommendation.id,
  });

  return entry;
}
