import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'version-control',
  version: '0.1.0',
});

server.registerTool(
  'list_commits',
  {
    title: 'List Commits',
    description:
      'List commits on a branch with optional filters. Returns normalized commit data.',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branch: z.string().optional().describe('Branch name or SHA'),
      since: z.string().optional().describe('Only commits after this date (ISO 8601)'),
      until: z.string().optional().describe('Only commits before this date (ISO 8601)'),
      limit: z.number().int().positive().optional().describe('Maximum number of commits'),
    },
  },
  async ({ owner, repo, branch, since, until, limit }) => {
    // TODO: delegate to upstream github MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              commits: [],
              query: { owner, repo, branch: branch ?? null, since: since ?? null, until: until ?? null, limit: limit ?? 30 },
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  'list_prs',
  {
    title: 'List Pull Requests',
    description:
      'List pull requests with optional state and sort filters. Returns normalized PR data.',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('PR state filter'),
      sort: z
        .enum(['created', 'updated', 'popularity'])
        .optional()
        .describe('Sort order'),
      limit: z.number().int().positive().optional().describe('Maximum number of PRs'),
    },
  },
  async ({ owner, repo, state, sort, limit }) => {
    // TODO: delegate to upstream github MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              pull_requests: [],
              query: { owner, repo, state: state ?? null, sort: sort ?? null, limit: limit ?? 30 },
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  'get_diff',
  {
    title: 'Get Diff',
    description:
      'Get the diff between two refs (branches, tags, commits). Returns normalized diff data.',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      base: z.string().describe('Base ref (branch, tag, or SHA)'),
      head: z.string().describe('Head ref to compare'),
    },
  },
  async ({ owner, repo, base, head }) => {
    // TODO: delegate to upstream github MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              files: [],
              total_commits: null,
              query: { owner, repo, base, head },
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  'get_pr_details',
  {
    title: 'Get PR Details',
    description:
      'Get full details of a specific pull request. Returns normalized PR data.',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pr_number: z.number().int().describe('Pull request number'),
    },
  },
  async ({ owner, repo, pr_number }) => {
    // TODO: delegate to upstream github MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              number: pr_number,
              title: null,
              body: null,
              state: null,
              author: null,
              created: null,
              merged: null,
              merge_commit: null,
              files_changed: null,
              additions: null,
              deletions: null,
              query: { owner, repo, pr_number },
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
