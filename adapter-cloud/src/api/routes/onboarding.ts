/**
 * Onboarding wizard endpoints:
 *   POST /api/v1/onboard          — auto-discover repo & generate draft domain config
 *   POST /api/v1/onboard/confirm  — validate and save confirmed domain config
 *
 * The discovery step uses the octocode MCP to inspect build configs and repo
 * structure, then generates a draft domain.json following core/domain/schema.json.
 */

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validation.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = createLogger('api:onboarding');

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

/** POST /api/v1/onboard — discovery request */
export const onboardDiscoverSchema = z.object({
  github_repo: z.string().min(1, 'github_repo is required (e.g. "org/repo")'),
  jira_project: z.string().min(1, 'jira_project is required (e.g. "PROJ")'),
});

/** POST /api/v1/onboard/confirm — confirmation request */
export const onboardConfirmSchema = z.object({
  config: z.object({
    company: z.string().min(1),
    division: z.string().min(1),
    side: z.string().min(1),
    repo: z.string().min(1),
    github_org: z.string().min(1),
    github_repo: z.string().min(1),
    jira_project: z.string().min(1),
    jira_url: z.string().url().optional(),
    artifact_prefix: z.string().min(1),
    primary_services: z.array(z.object({
      name: z.string().min(1),
      artifact_id: z.string().min(1),
    })).min(1),
    slack_channels: z.object({
      alerts: z.string().optional(),
      dev: z.string().optional(),
      incidents: z.string().optional(),
    }).optional(),
    toggle_prefix: z.string().optional(),
    grafana_url: z.string().url().optional(),
    grafana_app_analytics_dashboard: z.string().optional(),
    request_id_format: z.string().optional(),
    language: z.string().optional(),
    build_system: z.string().optional(),
    monorepo: z.boolean().optional(),
  }),
});

export type OnboardDiscoverBody = z.infer<typeof onboardDiscoverSchema>;
export type OnboardConfirmBody = z.infer<typeof onboardConfirmSchema>;

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** File patterns that indicate a particular language */
const LANGUAGE_INDICATORS: Record<string, string[]> = {
  scala: ['build.sbt', '*.scala'],
  typescript: ['tsconfig.json', 'package.json'],
  java: ['pom.xml', '*.java'],
  python: ['setup.py', 'pyproject.toml', 'requirements.txt'],
  go: ['go.mod', 'go.sum'],
  rust: ['Cargo.toml'],
  kotlin: ['build.gradle.kts'],
};

/** Build system detection from file names */
const BUILD_SYSTEM_INDICATORS: Record<string, string[]> = {
  bazel: ['BUILD', 'BUILD.bazel', 'WORKSPACE', 'WORKSPACE.bazel'],
  maven: ['pom.xml'],
  gradle: ['build.gradle', 'build.gradle.kts', 'settings.gradle'],
  sbt: ['build.sbt'],
  npm: ['package.json'],
  cargo: ['Cargo.toml'],
};

/** Monorepo indicators */
const MONOREPO_INDICATORS = [
  'lerna.json',
  'pnpm-workspace.yaml',
  'nx.json',
  'rush.json',
  'WORKSPACE',
  'WORKSPACE.bazel',
  'settings.gradle',
];

interface DetectedInfo {
  language: string;
  build_system: string;
  monorepo: boolean;
  services: string[];
}

interface RepoFile {
  name: string;
  path: string;
}

/**
 * Detect language from a list of repo file paths.
 */
function detectLanguage(files: RepoFile[]): string {
  const fileNames = new Set(files.map((f) => f.name));
  const filePaths = files.map((f) => f.path);

  for (const [lang, indicators] of Object.entries(LANGUAGE_INDICATORS)) {
    for (const indicator of indicators) {
      if (indicator.startsWith('*')) {
        const ext = indicator.slice(1);
        if (filePaths.some((p) => p.endsWith(ext))) return lang;
      } else {
        if (fileNames.has(indicator)) return lang;
      }
    }
  }
  return 'unknown';
}

/**
 * Detect build system from a list of repo file paths.
 */
function detectBuildSystem(files: RepoFile[]): string {
  const fileNames = new Set(files.map((f) => f.name));

  for (const [system, indicators] of Object.entries(BUILD_SYSTEM_INDICATORS)) {
    for (const indicator of indicators) {
      if (fileNames.has(indicator)) return system;
    }
  }
  return 'unknown';
}

/**
 * Detect whether this is a monorepo from file paths.
 */
function detectMonorepo(files: RepoFile[]): boolean {
  const fileNames = new Set(files.map((f) => f.name));
  return MONOREPO_INDICATORS.some((indicator) => fileNames.has(indicator));
}

/**
 * Extract service names from build config files.
 * Looks for common patterns in Maven, Gradle, Bazel, npm module names.
 */
function extractServiceNames(files: RepoFile[]): string[] {
  const services: string[] = [];

  for (const file of files) {
    // Maven / Gradle module directories often follow pattern: <service-name>/src/main
    if (file.name === 'pom.xml' || file.name === 'build.gradle' || file.name === 'build.gradle.kts') {
      const parts = file.path.split('/');
      if (parts.length >= 2) {
        const moduleName = parts[parts.length - 2];
        // Skip root-level build files and common non-service dirs
        if (!['', '.', 'src', 'test', 'tests', 'lib', 'buildSrc'].includes(moduleName)) {
          services.push(moduleName);
        }
      }
    }

    // Bazel BUILD files in module directories
    if ((file.name === 'BUILD' || file.name === 'BUILD.bazel') && file.path.includes('/')) {
      const parts = file.path.split('/');
      if (parts.length >= 2) {
        const moduleName = parts[parts.length - 2];
        if (!['', '.', 'src', 'test', 'tests', 'third_party'].includes(moduleName)) {
          services.push(moduleName);
        }
      }
    }

    // npm workspaces — package.json in subdirectories
    if (file.name === 'package.json' && file.path.includes('/')) {
      const parts = file.path.split('/');
      if (parts.length >= 2 && parts.length <= 4) {
        const moduleName = parts[parts.length - 2];
        if (!['', '.', 'node_modules'].includes(moduleName)) {
          services.push(moduleName);
        }
      }
    }
  }

  // Deduplicate and sort
  return [...new Set(services)].sort();
}

/**
 * Use octocode MCP (via repo structure inspection) to discover repo files.
 * Falls back to a simulated file list when MCP is unavailable.
 */
async function discoverRepoFiles(githubRepo: string): Promise<RepoFile[]> {
  // In production, this calls the octocode MCP tool:
  //   octocode__githubViewRepoStructure({ owner, repo, depth: 2 })
  //   octocode__githubSearchCode({ keywordsToSearch: ["BUILD", "pom.xml", ...] })
  //
  // For now, we return a placeholder to be populated by MCP integration.
  // The caller handles both cases gracefully.

  log.info('Discovering repo structure via MCP', { github_repo: githubRepo });

  // Attempt to use the MCP registry if available in the request context.
  // This will be injected once the MCP onboarding integration is wired up.
  // For now, return empty to trigger heuristic-only detection.
  return [];
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const onboardingRouter = Router();

// --- POST / — discover repo and generate draft config ---
onboardingRouter.post('/', queryRateLimit, validateBody(onboardDiscoverSchema), async (req, res) => {
  const { github_repo, jira_project } = req.body as OnboardDiscoverBody;

  try {
    log.info('Starting onboarding discovery', { github_repo, jira_project });

    // Parse org/repo
    const repoParts = github_repo.split('/');
    if (repoParts.length !== 2) {
      res.status(400).json({ error: 'github_repo must be in "org/repo" format' });
      return;
    }
    const [githubOrg, repoName] = repoParts;

    // Discover repo files via MCP
    const files = await discoverRepoFiles(github_repo);

    // Detect language, build system, monorepo status
    const detected: DetectedInfo = {
      language: detectLanguage(files),
      build_system: detectBuildSystem(files),
      monorepo: detectMonorepo(files),
      services: extractServiceNames(files),
    };

    // If no services discovered, use the repo name as the default service
    if (detected.services.length === 0) {
      detected.services = [repoName];
    }

    // Infer artifact prefix from org + repo name
    const artifactPrefix = `com.${githubOrg.replace(/-/g, '')}.${repoName.replace(/-/g, '.')}`;

    // Build draft domain config following core/domain/schema.json
    const draft = {
      company: githubOrg,
      division: repoName,
      side: 'Server',
      repo: repoName,
      github_org: githubOrg,
      github_repo: github_repo,
      jira_project: jira_project,
      artifact_prefix: artifactPrefix,
      primary_services: detected.services.map((svc) => ({
        name: svc,
        artifact_id: `${artifactPrefix}.${svc}`,
      })),
      language: detected.language,
      build_system: detected.build_system,
      monorepo: detected.monorepo,
    };

    log.info('Onboarding discovery complete', {
      github_repo,
      detected_language: detected.language,
      detected_build_system: detected.build_system,
      services_count: detected.services.length,
    });

    res.json({ draft, detected });
  } catch (err) {
    log.error('Onboarding discovery failed', {
      error: err instanceof Error ? err.message : String(err),
      github_repo,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /confirm — validate and save confirmed domain config ---
onboardingRouter.post('/confirm', queryRateLimit, validateBody(onboardConfirmSchema), async (req, res) => {
  const { config } = req.body as OnboardConfirmBody;

  try {
    log.info('Confirming onboarding config', {
      github_repo: config.github_repo,
      jira_project: config.jira_project,
    });

    // Save confirmed domain config to database
    const result = await query<{ id: string }>(
      `INSERT INTO domain_configs (name, description, services, mcp_servers, settings)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        config.repo,
        `Domain config for ${config.github_repo} (${config.jira_project})`,
        JSON.stringify(config.primary_services.map((s) => s.name)),
        JSON.stringify([]),
        JSON.stringify(config),
      ],
    );

    const domainId = result.rows[0].id;

    log.info('Domain onboarded successfully', {
      domain_id: domainId,
      github_repo: config.github_repo,
    });

    res.status(201).json({
      domain_id: domainId,
      status: 'onboarded',
    });
  } catch (err) {
    log.error('Onboarding confirmation failed', {
      error: err instanceof Error ? err.message : String(err),
      github_repo: config.github_repo,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
