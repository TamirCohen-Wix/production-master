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
    description:
      'Query application logs with filters and time range. Returns normalized log entries.',
    inputSchema: {
      query: z.string().describe('Log query (provider-specific syntax: SQL, LogQL, etc.)'),
      from_time: z.string().describe('Start of time range (ISO 8601)'),
      to_time: z.string().describe('End of time range (ISO 8601)'),
      service_id: z.string().optional().describe('Service/artifact identifier to scope logs'),
      level: z
        .enum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
        .optional()
        .describe('Minimum log level filter'),
      limit: z.number().int().positive().max(500).optional().describe('Maximum log entries to return'),
    },
  },
  async ({ query, from_time, to_time, service_id, level, limit }) => {
    // TODO: delegate to upstream grafana-datasource MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              entries: [],
              total: 0,
              query: { query, from_time, to_time, service_id: service_id ?? null, level: level ?? null, limit: limit ?? 100 },
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
    description:
      'Query time-series metrics (CPU, memory, request rates, latency). Returns normalized series data.',
    inputSchema: {
      expression: z.string().describe('Metric query expression (PromQL, etc.)'),
      from_time: z.string().optional().describe('Start of time range (ISO 8601)'),
      to_time: z.string().optional().describe('End of time range (ISO 8601)'),
      step: z.string().optional().describe('Query resolution step (e.g., 5m, 1h)'),
    },
  },
  async ({ expression, from_time, to_time, step }) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            provider: 'scaffold',
            series: [],
            query: { expression, from_time, to_time: to_time ?? null, step: step ?? null },
          },
          null,
          2,
        ),
      },
    ],
  }),
);

server.registerTool(
  'get_error_details',
  {
    title: 'Get Error Details',
    description:
      'Get detailed information about error occurrences for a service. Returns normalized error entries.',
    inputSchema: {
      service_id: z.string().describe('Service/artifact identifier'),
      from_time: z.string().describe('Start of time range (ISO 8601)'),
      to_time: z.string().describe('End of time range (ISO 8601)'),
      error_class: z.string().optional().describe('Filter by exception class name'),
      limit: z.number().int().positive().optional().describe('Maximum number of error entries'),
    },
  },
  async ({ service_id, from_time, to_time, error_class, limit }) => {
    // TODO: delegate to upstream grafana-datasource MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              errors: [],
              total: 0,
              query: { service_id, from_time, to_time, error_class: error_class ?? null, limit: limit ?? 50 },
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
  'trace_request',
  {
    title: 'Trace Request',
    description:
      'Trace a single request across all services by request ID. Returns normalized span data.',
    inputSchema: {
      request_id: z.string().describe('Request correlation ID to trace'),
      from_time: z.string().describe('Start of time range (ISO 8601)'),
      to_time: z.string().describe('End of time range (ISO 8601)'),
    },
  },
  async ({ request_id, from_time, to_time }) => {
    // TODO: delegate to upstream grafana-datasource MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              spans: [],
              query: { request_id, from_time, to_time },
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
  'list_services',
  {
    title: 'List Services',
    description:
      'List available services/datasources for log querying. Returns normalized service list.',
    inputSchema: {
      type_filter: z.string().optional().describe('Optional filter by datasource type'),
    },
  },
  async ({ type_filter }) => {
    // TODO: delegate to upstream grafana-datasource MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              services: [],
              query: { type_filter: type_filter ?? null },
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
