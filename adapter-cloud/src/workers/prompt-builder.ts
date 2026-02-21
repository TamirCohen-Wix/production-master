/**
 * Prompt Builder — reads agent definitions from core/agents/, parses
 * YAML frontmatter, and assembles the full system prompt with skill
 * content injected.
 */

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Root of the monorepo (two levels up from adapter-cloud/src/) */
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

const AGENTS_DIR = join(REPO_ROOT, 'core', 'agents');
const SKILLS_DIR = join(REPO_ROOT, 'core', 'skills');

/**
 * Mapping from agent name to the skill directories whose SKILL.md files
 * should be injected into the prompt.
 *
 * Agents not listed here have no skill injection.
 */
export const AGENT_SKILL_MAP: Record<string, string[]> = {
  'grafana-analyzer': ['grafana-datasource', 'grafana-mcp'],
  'codebase-semantics': ['octocode'],
  'slack-analyzer': ['slack'],
  'production-analyzer': ['github', 'ft-release'],
  'artifact-resolver': ['grafana-datasource'],
  'hypotheses': ['fire-console'],
  'verifier': ['fire-console'],
  'fix-list': ['ft-release'],
  'publisher': ['jira', 'slack'],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  /** Frontmatter metadata parsed from the YAML block */
  frontmatter: AgentFrontmatter;
  /** Full body of the agent markdown (everything after the closing `---`) */
  body: string;
  /** Raw file content */
  raw: string;
}

export interface AgentFrontmatter {
  name: string;
  description?: string;
  model: string;
  tools?: string;
  mcpServers?: string;
  skills?: string[];
  maxTurns?: number;
  [key: string]: unknown;
}

export interface PromptContext {
  /** Additional context injected into the prompt (e.g. investigation state) */
  investigationContext?: string;
  /** Override which skills to inject (default: use AGENT_SKILL_MAP) */
  skillOverrides?: string[];
}

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const EMPTY_FRONTMATTER_RE = /^---\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Minimal YAML-subset parser that handles the frontmatter format used by
 * agent definition files.  Supports scalars, simple lists (` - item`), and
 * basic key: value pairs.  Does NOT handle nested objects or multi-line
 * strings — that is intentional to keep dependencies minimal.
 */
export function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  // Handle empty frontmatter (---\n---) as a special case
  const emptyMatch = raw.match(EMPTY_FRONTMATTER_RE);
  if (emptyMatch && !raw.match(FRONTMATTER_RE)) {
    return { meta: {}, body: emptyMatch[1]?.trim() ?? '' };
  }

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const [, yamlBlock, body] = match;
  const meta: Record<string, unknown> = {};
  let currentListKey: string | null = null;

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();

    // List continuation: "  - value"
    if (currentListKey && /^\s*-\s+/.test(line)) {
      const listValue = trimmed.replace(/^-\s+/, '');
      (meta[currentListKey] as string[]).push(listValue);
      continue;
    }

    currentListKey = null;

    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    if (rawValue === '' || rawValue === '|' || rawValue === '>') {
      // Might be the start of a list — peek handled by next iterations
      meta[key] = [];
      currentListKey = key;
      continue;
    }

    // Numeric
    if (/^\d+$/.test(rawValue)) {
      meta[key] = parseInt(rawValue, 10);
      continue;
    }

    // Boolean
    if (rawValue === 'true' || rawValue === 'false') {
      meta[key] = rawValue === 'true';
      continue;
    }

    meta[key] = rawValue;
  }

  return { meta, body: body.trim() };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read and parse an agent definition from `core/agents/<name>.md`.
 */
export async function readAgentDefinition(name: string): Promise<AgentDefinition> {
  const filePath = join(AGENTS_DIR, `${name}.md`);
  const raw = await readFile(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  return {
    frontmatter: meta as unknown as AgentFrontmatter,
    body,
    raw,
  };
}

/**
 * Read the SKILL.md content for a single skill directory.
 */
async function readSkillContent(skillName: string): Promise<string> {
  const filePath = join(SKILLS_DIR, skillName, 'SKILL.md');
  return readFile(filePath, 'utf-8');
}

/**
 * Inject all skill content relevant to an agent.  Returns a combined
 * string with each skill delimited by a header.
 */
export async function injectSkillContent(agentName: string): Promise<string> {
  const skills = AGENT_SKILL_MAP[agentName];
  if (!skills || skills.length === 0) return '';

  const parts: string[] = [];

  for (const skill of skills) {
    try {
      const content = await readSkillContent(skill);
      parts.push(`## Skill Reference: ${skill}\n\n${content}`);
    } catch {
      // Skill file missing — skip gracefully
      parts.push(`## Skill Reference: ${skill}\n\n_Skill file not found._`);
    }
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Build the full system prompt for an agent, combining the agent
 * definition body, skill references, and optional investigation context.
 */
export async function buildPrompt(
  agentName: string,
  context: PromptContext = {},
): Promise<string> {
  const definition = await readAgentDefinition(agentName);
  const skillContent = await injectSkillContent(agentName);

  const sections: string[] = [definition.body];

  if (skillContent) {
    sections.push('\n\n# Skill References\n\n' + skillContent);
  }

  if (context.investigationContext) {
    sections.push('\n\n# Investigation Context\n\n' + context.investigationContext);
  }

  return sections.join('');
}
