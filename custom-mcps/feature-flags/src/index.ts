import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'feature-flags',
  version: '0.1.0',
});

server.registerTool(
  'get_flag',
  {
    title: 'Get Flag',
    description:
      'Get full details of a specific feature flag. Returns normalized flag data.',
    inputSchema: {
      flag_id: z.string().describe('Feature flag identifier'),
    },
  },
  async ({ flag_id }) => {
    // TODO: delegate to upstream ft-release MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              flag_id,
              name: null,
              description: null,
              status: null,
              strategy: null,
              rollout_percentage: null,
              ownership_tag: null,
              created: null,
              updated: null,
              query: { flag_id },
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
  'list_flags',
  {
    title: 'List Flags',
    description:
      'Search and list feature flags by name, status, or ownership. Returns normalized flag list.',
    inputSchema: {
      search_text: z.string().optional().describe('Search term for flag name or description'),
      status: z.string().optional().describe('Filter by flag status'),
      ownership_tag: z.string().optional().describe('Filter by ownership tag'),
      limit: z.number().int().positive().optional().describe('Maximum number of results'),
      offset: z.number().int().optional().describe('Pagination offset'),
    },
  },
  async ({ search_text, status, ownership_tag, limit, offset }) => {
    // TODO: delegate to upstream ft-release MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              flags: [],
              total: 0,
              query: {
                search_text: search_text ?? null,
                status: status ?? null,
                ownership_tag: ownership_tag ?? null,
                limit: limit ?? 20,
                offset: offset ?? 0,
              },
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
  'get_rollout_history',
  {
    title: 'Get Rollout History',
    description:
      'Get the release/rollout history for a feature flag. Returns normalized release data.',
    inputSchema: {
      flag_id: z.string().describe('Feature flag identifier'),
      limit: z.number().int().positive().optional().describe('Maximum number of releases to return'),
    },
  },
  async ({ flag_id, limit }) => {
    // TODO: delegate to upstream ft-release MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              releases: [],
              query: { flag_id, limit: limit ?? 20 },
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
