import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'log-system',
  version: '0.1.0',
});

server.registerTool(
  'query_logs',
  {
    title: 'Query Logs',
    description: 'Capability-level API for querying production logs.',
    inputSchema: {
      service: z.string(),
      level: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).optional(),
      from: z.string(),
      to: z.string().optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().max(500).optional(),
    },
  },
  async ({ service, level, from, to, query, limit }) => {
    // This scaffold intentionally returns a normalized payload shape.
    // Provider-specific translation to Grafana/Datadog lives in follow-up PRs.
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              service,
              level: level ?? null,
              from,
              to: to ?? null,
              query: query ?? null,
              limit: limit ?? 100,
              records: [],
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
  'query_metrics',
  {
    title: 'Query Metrics',
    description: 'Capability-level API for querying service metrics.',
    inputSchema: {
      service: z.string(),
      metric: z.string(),
      from: z.string(),
      to: z.string().optional(),
    },
  },
  async ({ service, metric, from, to }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            provider: 'scaffold',
            service,
            metric,
            from,
            to: to ?? null,
            series: [],
          },
          null,
          2,
        ),
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
