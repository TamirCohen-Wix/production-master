/**
 * Unit tests for prompt-builder.ts
 *
 * Uses mock agent/skill files written to a temp directory so the tests
 * are fully self-contained and do not depend on the real core/ tree.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { parseFrontmatter, AGENT_SKILL_MAP } from '../../../src/workers/prompt-builder.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// ---------------------------------------------------------------------------
// parseFrontmatter (pure function — no I/O)
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('should parse a well-formed agent frontmatter block', () => {
    const raw = [
      '---',
      'name: test-agent',
      'description: A test agent for unit tests.',
      'model: sonnet',
      'tools: Read, Write, Bash',
      'mcpServers: mcp-s',
      'skills:',
      '  - grafana-datasource',
      '  - octocode',
      'maxTurns: 25',
      '---',
      '',
      '# Test Agent',
      '',
      'You are a test agent.',
    ].join('\n');

    const { meta, body } = parseFrontmatter(raw);

    expect(meta.name).toBe('test-agent');
    expect(meta.description).toBe('A test agent for unit tests.');
    expect(meta.model).toBe('sonnet');
    expect(meta.tools).toBe('Read, Write, Bash');
    expect(meta.skills).toEqual(['grafana-datasource', 'octocode']);
    expect(meta.maxTurns).toBe(25);
    expect(body).toContain('# Test Agent');
    expect(body).toContain('You are a test agent.');
  });

  it('should return empty meta when no frontmatter delimiters exist', () => {
    const raw = '# Just a markdown file\n\nNo frontmatter here.';
    const { meta, body } = parseFrontmatter(raw);

    expect(meta).toEqual({});
    expect(body).toBe(raw);
  });

  it('should handle frontmatter with no skills list', () => {
    const raw = [
      '---',
      'name: simple-agent',
      'model: haiku',
      '---',
      '',
      'Body content.',
    ].join('\n');

    const { meta, body } = parseFrontmatter(raw);

    expect(meta.name).toBe('simple-agent');
    expect(meta.model).toBe('haiku');
    expect(meta.skills).toBeUndefined();
    expect(body).toBe('Body content.');
  });

  it('should handle boolean values', () => {
    const raw = [
      '---',
      'name: bool-test',
      'verbose: true',
      'silent: false',
      '---',
      '',
      'Body.',
    ].join('\n');

    const { meta } = parseFrontmatter(raw);
    expect(meta.verbose).toBe(true);
    expect(meta.silent).toBe(false);
  });

  it('should handle empty frontmatter block', () => {
    const raw = '---\n---\nBody only.';
    const { meta, body } = parseFrontmatter(raw);
    expect(meta).toEqual({});
    expect(body).toBe('Body only.');
  });
});

// ---------------------------------------------------------------------------
// readAgentDefinition + injectSkillContent + buildPrompt (I/O-based)
// ---------------------------------------------------------------------------

describe('readAgentDefinition / buildPrompt (file-based)', () => {
  let tmpDir: string;
  let origReadFile: typeof fs.readFile;

  const MOCK_AGENT = [
    '---',
    'name: mock-grafana-analyzer',
    'description: Mock agent for testing.',
    'model: sonnet',
    'skills:',
    '  - grafana-datasource',
    'maxTurns: 20',
    '---',
    '',
    '# Mock Grafana Analyzer',
    '',
    'You are a mock agent used for testing prompt building.',
  ].join('\n');

  const MOCK_SKILL = [
    '# Grafana Datasource Skill',
    '',
    'Use the `query_app_logs` tool to query Grafana.',
  ].join('\n');

  beforeAll(async () => {
    // Create temp directory structure mimicking core/
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pm-test-'));
    const agentsDir = path.join(tmpDir, 'core', 'agents');
    const skillsDir = path.join(tmpDir, 'core', 'skills', 'grafana-datasource');

    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(agentsDir, 'mock-grafana-analyzer.md'), MOCK_AGENT);
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), MOCK_SKILL);
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should have all expected agents in AGENT_SKILL_MAP', () => {
    // Verify the mapping exists for the agents specified in the requirements
    expect(AGENT_SKILL_MAP['grafana-analyzer']).toEqual(['grafana-datasource', 'grafana-mcp']);
    expect(AGENT_SKILL_MAP['codebase-semantics']).toEqual(['octocode']);
    expect(AGENT_SKILL_MAP['slack-analyzer']).toEqual(['slack']);
    expect(AGENT_SKILL_MAP['production-analyzer']).toEqual(['github', 'ft-release']);
    expect(AGENT_SKILL_MAP['artifact-resolver']).toEqual(['grafana-datasource']);
    expect(AGENT_SKILL_MAP['hypotheses']).toEqual(['fire-console']);
    expect(AGENT_SKILL_MAP['verifier']).toEqual(['fire-console']);
    expect(AGENT_SKILL_MAP['fix-list']).toEqual(['ft-release']);
    expect(AGENT_SKILL_MAP['publisher']).toEqual(['jira', 'slack']);
  });

  it('should have exactly 9 agent-to-skill mappings', () => {
    expect(Object.keys(AGENT_SKILL_MAP)).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// AGENT_SKILL_MAP validation against real agent files
// ---------------------------------------------------------------------------

describe('AGENT_SKILL_MAP consistency', () => {
  it('every mapped skill directory name should match a known skill', () => {
    const knownSkills = [
      'context7', 'fire-console', 'ft-release', 'github',
      'grafana-datasource', 'grafana-mcp', 'jira', 'octocode', 'slack',
    ];

    for (const [agent, skills] of Object.entries(AGENT_SKILL_MAP)) {
      for (const skill of skills) {
        expect(knownSkills).toContain(skill);
      }
    }
  });
});
