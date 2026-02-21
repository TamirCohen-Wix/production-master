/**
 * Meta-Analysis Worker — scheduled job (weekly or on-demand) that:
 *
 * 1. Queries aggregated feedback data grouped by domain, agent, and phase
 * 2. Calls the meta-improver agent with the aggregated data
 * 3. Parses structured recommendations from agent output
 * 4. Stores recommendations in the recommendations table
 */

import { query } from '../storage/db.js';
import { runAgent, type AgentRunOptions } from './agent-runner.js';
import * as RecommendationModel from '../storage/models/recommendation.js';
import type { CreateRecommendationInput } from '../storage/models/recommendation.js';
import { createLogger } from '../observability/index.js';
import { runFeedbackCorroboration } from './feedback-corroborator.js';
import type { McpRegistry } from './tool-handler.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('worker:meta-analysis');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentFeedbackRow {
  domain: string;
  agent_name: string;
  phase: string;
  total_runs: string;
  accurate_count: string;
  inaccurate_count: string;
  accuracy_rate: string;
  common_corrections: string | null;
}

interface MetaRecommendation {
  type: 'prompt_rewrite' | 'workflow_change' | 'threshold_adjustment';
  target: string;
  current: string;
  proposed: string;
  rationale: string;
  expected_impact: string;
}

// ---------------------------------------------------------------------------
// Feedback Aggregation
// ---------------------------------------------------------------------------

/**
 * Query feedback data aggregated by domain, agent, and phase.
 * Falls back gracefully if the feedback table does not yet exist.
 */
async function aggregateFeedback(): Promise<AgentFeedbackRow[]> {
  try {
    const result = await query<AgentFeedbackRow>(
      `SELECT
         i.domain,
         ar.agent_name,
         i.phase,
         COUNT(*)::text AS total_runs,
         COUNT(*) FILTER (WHERE f.is_accurate = true)::text AS accurate_count,
         COUNT(*) FILTER (WHERE f.is_accurate = false)::text AS inaccurate_count,
         ROUND(
           COUNT(*) FILTER (WHERE f.is_accurate = true)::numeric / NULLIF(COUNT(*), 0) * 100,
           1
         )::text AS accuracy_rate,
         STRING_AGG(DISTINCT f.corrected_root_cause, ' | ')::text AS common_corrections
       FROM feedback f
       JOIN investigations i ON i.id = f.investigation_id
       JOIN agent_runs ar ON ar.investigation_id = i.id
       GROUP BY i.domain, ar.agent_name, i.phase
       ORDER BY accuracy_rate ASC NULLS FIRST`,
    );
    return result.rows;
  } catch (err) {
    log.warn('Failed to aggregate feedback — table may not exist yet', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Recommendation Parsing
// ---------------------------------------------------------------------------

/**
 * Extract the JSON recommendation array from the agent's free-text output.
 * Looks for the first `[...]` JSON block in the response.
 */
function parseRecommendations(agentOutput: string): MetaRecommendation[] {
  // Try to find a JSON array in the output
  const jsonMatch = agentOutput.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    log.warn('No JSON array found in meta-improver output');
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as MetaRecommendation[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    log.error('Failed to parse recommendations JSON', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full meta-analysis pipeline:
 *
 * 1. Aggregate feedback from DB
 * 2. Invoke the meta-improver agent
 * 3. Parse recommendations from agent output
 * 4. Store each recommendation in the recommendations table
 *
 * Returns the list of created recommendations.
 */
export async function runMetaAnalysis(
  mcpRegistry: McpRegistry,
): Promise<RecommendationModel.Recommendation[]> {
  log.info('Starting meta-analysis run');

  // 1. Aggregate feedback data
  const feedbackRows = await aggregateFeedback();

  if (feedbackRows.length === 0) {
    log.info('No feedback data available for meta-analysis — skipping');
    return [];
  }

  log.info('Aggregated feedback data', {
    rowCount: feedbackRows.length,
    domains: [...new Set(feedbackRows.map((r) => r.domain))],
  });

  // 2. Build context for the meta-improver agent
  const investigationContext = [
    '## Aggregated Feedback Data\n',
    '| Domain | Agent | Phase | Total Runs | Accurate | Inaccurate | Accuracy % | Common Corrections |',
    '|--------|-------|-------|-----------|----------|------------|------------|-------------------|',
    ...feedbackRows.map(
      (r) =>
        `| ${r.domain} | ${r.agent_name} | ${r.phase} | ${r.total_runs} | ${r.accurate_count} | ${r.inaccurate_count} | ${r.accuracy_rate}% | ${r.common_corrections ?? 'N/A'} |`,
    ),
    '\n\nAnalyze this data and produce your recommendations as a JSON array.',
  ].join('\n');

  // 3. Call the meta-improver agent
  const agentOptions: AgentRunOptions = {
    investigationContext,
    mcpRegistry,
    maxIterations: 10,
  };

  const output = await runAgent('meta-improver', { investigationContext }, agentOptions);

  log.info('Meta-improver agent completed', {
    iterations: output.iterations,
    stopReason: output.stopReason,
    tokenUsage: output.tokenUsage,
  });

  // 4. Parse recommendations from output
  const recommendations = parseRecommendations(output.content);

  if (recommendations.length === 0) {
    log.warn('Meta-improver produced no parseable recommendations');
    return [];
  }

  log.info('Parsed recommendations', { count: recommendations.length });

  // 5. Store each recommendation
  const created: RecommendationModel.Recommendation[] = [];

  for (const rec of recommendations) {
    try {
      const input: CreateRecommendationInput = {
        type: rec.type,
        target: rec.target,
        current_value: rec.current,
        proposed_value: rec.proposed,
        rationale: rec.rationale,
        expected_impact: rec.expected_impact,
      };

      const saved = await RecommendationModel.create(input);
      created.push(saved);
    } catch (err) {
      log.error('Failed to store recommendation', {
        error: err instanceof Error ? err.message : String(err),
        recommendation: rec,
      });
    }
  }

  log.info('Meta-analysis complete', {
    totalRecommendations: recommendations.length,
    storedSuccessfully: created.length,
  });

  // 6. Run feedback corroboration
  try {
    const corroboratedEntries = await runFeedbackCorroboration();
    log.info('Feedback corroboration completed', {
      entries_created: corroboratedEntries.length,
    });
  } catch (err) {
    log.warn('Feedback corroboration failed — non-fatal', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return created;
}
