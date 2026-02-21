/**
 * Hypothesis / verification loop.
 *
 * Implements an iterative cycle where:
 * 1. A hypothesis agent proposes a root-cause hypothesis
 * 2. A verification agent tests the hypothesis against evidence
 * 3. If confidence is above threshold, accept; otherwise iterate
 * 4. Maximum 5 iterations before accepting the best hypothesis
 */

import { dispatchAgent, type DispatchOptions } from './dispatcher.js';
import type { AgentOutput } from '../workers/agent-runner.js';
import type { McpRegistry } from '../workers/tool-handler.js';
import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';
import { pmHypothesisIterations, pmHypothesisConfidence } from '../observability/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Hypothesis {
  iteration: number;
  hypothesis: string;
  confidence: number;
  evidence_summary: string;
  verified: boolean;
}

export interface HypothesisLoopResult {
  accepted_hypothesis: Hypothesis;
  all_hypotheses: Hypothesis[];
  iterations: number;
  converged: boolean;
}

export interface HypothesisLoopOptions {
  investigationId: string;
  /** Context from previous pipeline phases */
  gatherContext: string;
  /** MCP registry for agent dispatch */
  mcpRegistry: McpRegistry;
  /** Confidence threshold for acceptance (default: 0.8) */
  confidenceThreshold?: number;
  /** Maximum iterations (default: 5) */
  maxIterations?: number;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('orchestrator:hypothesis-loop');

const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
const DEFAULT_MAX_ITERATIONS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseHypothesisOutput(output: AgentOutput, iteration: number): Hypothesis {
  // Try to parse structured JSON from agent output
  try {
    const match = output.content.match(/\{[\s\S]*"hypothesis"[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<Hypothesis>;
      return {
        iteration,
        hypothesis: parsed.hypothesis ?? output.content,
        confidence: parsed.confidence ?? 0,
        evidence_summary: parsed.evidence_summary ?? '',
        verified: false,
      };
    }
  } catch {
    // Fall through to default parsing
  }

  return {
    iteration,
    hypothesis: output.content,
    confidence: 0,
    evidence_summary: '',
    verified: false,
  };
}

function parseVerificationOutput(output: AgentOutput, hypothesis: Hypothesis): Hypothesis {
  try {
    const match = output.content.match(/\{[\s\S]*"confidence"[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<Hypothesis>;
      return {
        ...hypothesis,
        confidence: parsed.confidence ?? hypothesis.confidence,
        evidence_summary: parsed.evidence_summary ?? hypothesis.evidence_summary,
        verified: true,
      };
    }
  } catch {
    // Fall through
  }

  return { ...hypothesis, verified: true };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute the hypothesis / verification loop.
 *
 * Returns the accepted hypothesis along with iteration history.
 */
export async function runHypothesisLoop(options: HypothesisLoopOptions): Promise<HypothesisLoopResult> {
  const {
    investigationId,
    gatherContext,
    mcpRegistry,
    confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
    maxIterations = DEFAULT_MAX_ITERATIONS,
  } = options;

  log.info('Starting hypothesis loop', {
    investigation_id: investigationId,
    max_iterations: maxIterations,
    confidence_threshold: confidenceThreshold,
  });

  const allHypotheses: Hypothesis[] = [];
  let bestHypothesis: Hypothesis | undefined;

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    // --- Phase: Generate hypothesis ---
    const previousContext = allHypotheses.length > 0
      ? `\n\nPrevious hypotheses and their verification results:\n${JSON.stringify(allHypotheses, null, 2)}`
      : '';

    const dispatchOpts: DispatchOptions = {
      investigationId,
      agentName: 'hypotheses',
      investigationContext: `${gatherContext}${previousContext}`,
      mcpRegistry,
    };

    const hypothesisOutput = await dispatchAgent(dispatchOpts);
    const hypothesis = parseHypothesisOutput(hypothesisOutput, iteration);

    log.info('Hypothesis generated', {
      investigation_id: investigationId,
      iteration,
      initial_confidence: hypothesis.confidence,
    });

    // --- Phase: Verify hypothesis ---
    const verifyOutput = await dispatchAgent({
      investigationId,
      agentName: 'verification',
      investigationContext: `Hypothesis to verify:\n${JSON.stringify(hypothesis)}\n\nGathered evidence:\n${gatherContext}`,
      mcpRegistry,
    });

    const verified = parseVerificationOutput(verifyOutput, hypothesis);
    allHypotheses.push(verified);

    log.info('Hypothesis verified', {
      investigation_id: investigationId,
      iteration,
      confidence: verified.confidence,
    });

    // Track best hypothesis
    if (!bestHypothesis || verified.confidence > bestHypothesis.confidence) {
      bestHypothesis = verified;
    }

    // --- Persist iteration to DB ---
    try {
      await query(
        `INSERT INTO hypothesis_iterations (investigation_id, iteration, hypothesis, confidence, evidence_summary, verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [investigationId, iteration, verified.hypothesis, verified.confidence, verified.evidence_summary, verified.verified],
      );
    } catch (err) {
      log.error('Failed to persist hypothesis iteration', {
        investigation_id: investigationId,
        iteration,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // --- Check convergence ---
    if (verified.confidence >= confidenceThreshold) {
      log.info('Hypothesis loop converged', {
        investigation_id: investigationId,
        iterations: iteration,
        confidence: verified.confidence,
      });

      pmHypothesisIterations.observe(iteration);
      pmHypothesisConfidence.observe(verified.confidence);

      return {
        accepted_hypothesis: verified,
        all_hypotheses: allHypotheses,
        iterations: iteration,
        converged: true,
      };
    }
  }

  // Did not converge — accept best hypothesis
  const accepted = bestHypothesis ?? allHypotheses[allHypotheses.length - 1];

  log.warn('Hypothesis loop did not converge, accepting best', {
    investigation_id: investigationId,
    iterations: maxIterations,
    best_confidence: accepted.confidence,
  });

  pmHypothesisIterations.observe(maxIterations);
  pmHypothesisConfidence.observe(accepted.confidence);

  return {
    accepted_hypothesis: accepted,
    all_hypotheses: allHypotheses,
    iterations: maxIterations,
    converged: false,
  };
}
