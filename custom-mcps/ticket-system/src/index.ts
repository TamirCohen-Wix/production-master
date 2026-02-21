import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'ticket-system',
  version: '0.1.0',
});

server.registerTool(
  'get_ticket',
  {
    title: 'Get Ticket',
    description:
      'Retrieve a single ticket by its identifier. Returns normalized ticket data.',
    inputSchema: {
      ticket_id: z.string().describe('Unique ticket identifier (e.g., SCHED-45895)'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Optional list of fields to return'),
    },
  },
  async ({ ticket_id, fields }) => {
    // TODO: delegate to upstream jira MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              ticket_id,
              summary: null,
              description: null,
              status: null,
              priority: null,
              assignee: null,
              reporter: null,
              created: null,
              updated: null,
              comments: [],
              query: { ticket_id, fields: fields ?? null },
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
  'search_tickets',
  {
    title: 'Search Tickets',
    description:
      'Search for tickets matching query criteria. Returns normalized search results.',
    inputSchema: {
      query: z.string().describe('Search query string (provider-specific syntax)'),
      project: z.string().optional().describe('Project key to scope the search'),
      max_results: z.number().int().positive().optional().describe('Maximum number of results to return'),
    },
  },
  async ({ query, project, max_results }) => {
    // TODO: delegate to upstream jira MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              tickets: [],
              total: 0,
              query: { query, project: project ?? null, max_results: max_results ?? 50 },
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
  'add_comment',
  {
    title: 'Add Comment',
    description:
      'Add a comment to an existing ticket. Returns the created comment metadata.',
    inputSchema: {
      ticket_id: z.string().describe('Ticket to comment on'),
      comment: z.string().describe('Comment body text'),
    },
  },
  async ({ ticket_id, comment }) => {
    // TODO: delegate to upstream jira MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              comment_id: null,
              created: null,
              query: { ticket_id, comment },
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
  'update_status',
  {
    title: 'Update Status',
    description:
      'Transition a ticket to a new status. Returns the previous and new status.',
    inputSchema: {
      ticket_id: z.string().describe('Ticket to update'),
      status: z.string().describe('Target status name or ID'),
      comment: z.string().optional().describe('Optional comment to add with the transition'),
    },
  },
  async ({ ticket_id, status, comment }) => {
    // TODO: delegate to upstream jira MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              ticket_id,
              previous_status: null,
              new_status: null,
              query: { ticket_id, status, comment: comment ?? null },
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
