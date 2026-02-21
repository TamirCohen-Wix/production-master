import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'code-search',
  version: '0.1.0',
});

server.registerTool(
  'search_code',
  {
    title: 'Search Code',
    description:
      'Search code across repositories by keywords or patterns. Returns normalized search results.',
    inputSchema: {
      keywords: z
        .array(z.string())
        .describe('Search terms (code identifiers, error messages, etc.)'),
      repo: z.string().optional().describe('Repository to search in (e.g., owner/repo)'),
      match: z
        .enum(['file', 'path'])
        .optional()
        .describe('Match against file content or file path'),
      extension: z.string().optional().describe('File extension filter (e.g., scala, proto)'),
      limit: z.number().int().positive().optional().describe('Maximum number of results'),
    },
  },
  async ({ keywords, repo, match, extension, limit }) => {
    // TODO: delegate to upstream octocode MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              results: [],
              total: 0,
              query: { keywords, repo: repo ?? null, match: match ?? null, extension: extension ?? null, limit: limit ?? 20 },
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
  'get_file',
  {
    title: 'Get File',
    description:
      'Retrieve the content of a specific file from a repository. Returns normalized file data.',
    inputSchema: {
      repo: z.string().describe('Repository (e.g., owner/repo)'),
      path: z.string().describe('File path within the repository'),
      branch: z.string().optional().describe('Branch or ref to read from'),
      match_string: z.string().optional().describe('Highlight/focus on this string in the file'),
      start_line: z.number().int().optional().describe('Start line for partial content'),
      end_line: z.number().int().optional().describe('End line for partial content'),
    },
  },
  async ({ repo, path, branch, match_string, start_line, end_line }) => {
    // TODO: delegate to upstream octocode MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              path,
              content: null,
              language: null,
              size_bytes: null,
              query: { repo, path, branch: branch ?? null, match_string: match_string ?? null, start_line: start_line ?? null, end_line: end_line ?? null },
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
  'search_symbols',
  {
    title: 'Search Symbols',
    description:
      'Search for code symbols (classes, functions, types) across repositories. Returns normalized symbol data.',
    inputSchema: {
      symbol: z.string().describe('Symbol name to search for'),
      repo: z.string().optional().describe('Repository to scope the search'),
      kind: z
        .enum(['class', 'function', 'interface', 'type', 'variable'])
        .optional()
        .describe('Symbol kind filter'),
    },
  },
  async ({ symbol, repo, kind }) => {
    // TODO: delegate to upstream octocode MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              symbols: [],
              query: { symbol, repo: repo ?? null, kind: kind ?? null },
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
