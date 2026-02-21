/**
 * Model Registry — resolves model aliases and per-agent overrides to
 * concrete Anthropic model identifiers.
 *
 * The canonical config lives in models.yaml; this module provides the
 * runtime lookup used by agent-runner.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelAlias = 'haiku' | 'sonnet';

// ---------------------------------------------------------------------------
// Alias table (mirrors models.yaml — kept in code for zero-dep startup)
// ---------------------------------------------------------------------------

const MODEL_ALIASES: Record<ModelAlias, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

/**
 * Per-agent model overrides.  Values here take precedence over the
 * agent's frontmatter `model` field.  Agents not listed fall through
 * to the alias table.
 */
const AGENT_OVERRIDES: Record<string, ModelAlias> = {
  // Currently empty — add entries as needed, e.g.:
  // 'hypotheses': 'sonnet',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the concrete Anthropic model identifier for a given agent.
 *
 * Resolution order:
 * 1. Per-agent override (AGENT_OVERRIDES)
 * 2. Alias lookup from the agent's frontmatter `model` field
 * 3. Fall through to the raw value if it looks like a full model ID
 */
export function resolveModel(agentName: string, alias: ModelAlias | string): string {
  // Check per-agent override first
  const override = AGENT_OVERRIDES[agentName];
  if (override) {
    return MODEL_ALIASES[override];
  }

  // Try alias lookup
  if (alias in MODEL_ALIASES) {
    return MODEL_ALIASES[alias as ModelAlias];
  }

  // Assume it's already a full model identifier
  return alias;
}

/**
 * Return all known model aliases and their concrete identifiers.
 */
export function getModelAliases(): Record<string, string> {
  return { ...MODEL_ALIASES };
}
