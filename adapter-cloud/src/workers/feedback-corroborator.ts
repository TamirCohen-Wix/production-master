/**
 * Feedback Corroborator — groups matching corrected_root_cause feedback
 * entries and creates knowledge entries when patterns emerge.
 *
 * Corroboration logic:
 *   - ≥2 matching corrections → confidence: 'active', source: 'corroborated'
 *   - 1 correction → confidence: 'provisional', source: 'agent'
 *
 * Normalization: lowercase, trim, collapse whitespace (exact match for v1).
 */

import { query } from '../storage/db.js';
import * as KnowledgeEntryModel from '../storage/models/knowledge-entry.js';
import { createLogger } from '../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('worker:feedback-corroborator');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CorrectionGroup {
  normalized_correction: string;
  domain: string;
  feedback_count: string;
  feedback_ids: string[];
  sample_correction: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a correction string for grouping: lowercase, trim, collapse whitespace.
 */
function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run feedback corroboration:
 *
 * 1. Query feedback entries with non-null corrected_root_cause
 * 2. Group by normalized correction text + domain
 * 3. Create knowledge entries for groups:
 *    - ≥2 matches → active + corroborated
 *    - 1 match → provisional + agent
 * 4. Dedup by title + service to avoid duplicates
 */
export async function runFeedbackCorroboration(): Promise<KnowledgeEntryModel.KnowledgeEntry[]> {
  log.info('Starting feedback corroboration');

  // 1. Query feedback with corrections
  const result = await query<{
    id: string;
    corrected_root_cause: string;
    domain: string;
    investigation_id: string;
  }>(
    `SELECT f.id, f.corrected_root_cause, COALESCE(i.domain, 'unknown') AS domain, f.investigation_id
     FROM feedback f
     JOIN investigations i ON i.id = f.investigation_id
     WHERE f.corrected_root_cause IS NOT NULL
       AND f.corrected_root_cause != ''`,
  );

  if (result.rows.length === 0) {
    log.info('No corrected feedback found — skipping corroboration');
    return [];
  }

  log.info('Found feedback with corrections', { count: result.rows.length });

  // 2. Group by normalized correction + domain
  const groups = new Map<string, CorrectionGroup>();

  for (const row of result.rows) {
    const normalized = normalize(row.corrected_root_cause);
    const key = `${row.domain}::${normalized}`;

    if (!groups.has(key)) {
      groups.set(key, {
        normalized_correction: normalized,
        domain: row.domain,
        feedback_count: '0',
        feedback_ids: [],
        sample_correction: row.corrected_root_cause,
      });
    }

    const group = groups.get(key)!;
    group.feedback_count = String(parseInt(group.feedback_count, 10) + 1);
    group.feedback_ids.push(row.id);
  }

  // 3. Create knowledge entries
  const created: KnowledgeEntryModel.KnowledgeEntry[] = [];

  for (const [, group] of groups) {
    const count = parseInt(group.feedback_count, 10);
    const confidence = count >= 2 ? 'active' : 'provisional';
    const source = count >= 2 ? 'corroborated' : 'agent';

    const title = `Corrected RCA: ${group.sample_correction.slice(0, 100)}`;
    const service = group.domain;

    // 4. Dedup: check if a knowledge entry with this title + service already exists
    const { rows: existingRows } = await query(
      'SELECT 1 FROM knowledge_entries WHERE service = $1 AND title = $2 LIMIT 1',
      [service, title],
    );
    const duplicate = existingRows.length > 0;

    if (duplicate) {
      log.debug('Skipping duplicate knowledge entry', { title, service });
      continue;
    }

    try {
      const entry = await KnowledgeEntryModel.create({
        service,
        category: 'known_issue',
        title,
        content: {
          corrected_root_cause: group.sample_correction,
          corroboration_count: count,
          normalized: group.normalized_correction,
        },
        confidence: confidence as 'provisional' | 'active',
        source: source as 'agent' | 'corroborated',
        source_feedback_ids: group.feedback_ids,
      });

      created.push(entry);

      log.info('Created knowledge entry from corroboration', {
        knowledge_id: entry.id,
        confidence,
        source,
        feedback_count: count,
      });
    } catch (err) {
      log.error('Failed to create corroborated knowledge entry', {
        error: err instanceof Error ? err.message : String(err),
        title,
        service,
      });
    }
  }

  log.info('Feedback corroboration complete', {
    groups: groups.size,
    created: created.length,
  });

  return created;
}
