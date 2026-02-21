import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'team-comms',
  version: '0.1.0',
});

server.registerTool(
  'search_messages',
  {
    title: 'Search Messages',
    description:
      'Search messages across channels by keyword and filters. Returns normalized message results.',
    inputSchema: {
      query: z.string().describe('Search keywords'),
      channel: z.string().optional().describe('Channel name to scope the search'),
      from_user: z.string().optional().describe('Filter by message author'),
      after: z.string().optional().describe('Messages after this date (YYYY-MM-DD)'),
      before: z.string().optional().describe('Messages before this date (YYYY-MM-DD)'),
    },
  },
  async ({ query, channel, from_user, after, before }) => {
    // TODO: delegate to upstream slack MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              messages: [],
              total: 0,
              query: { query, channel: channel ?? null, from_user: from_user ?? null, after: after ?? null, before: before ?? null },
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
  'get_thread',
  {
    title: 'Get Thread',
    description:
      'Retrieve all replies in a message thread. Returns normalized thread data.',
    inputSchema: {
      channel_id: z.string().describe('Channel containing the thread'),
      thread_id: z.string().describe('Thread identifier (root message timestamp)'),
    },
  },
  async ({ channel_id, thread_id }) => {
    // TODO: delegate to upstream slack MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              messages: [],
              query: { channel_id, thread_id },
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
  'post_message',
  {
    title: 'Post Message',
    description:
      'Post a message to a channel. Returns message ID and timestamp.',
    inputSchema: {
      channel_id: z.string().describe('Target channel ID'),
      text: z.string().describe('Message text content'),
      thread_id: z.string().optional().describe('Optional thread ID to reply to'),
    },
  },
  async ({ channel_id, text, thread_id }) => {
    // TODO: delegate to upstream slack MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              message_id: null,
              timestamp: null,
              query: { channel_id, text, thread_id: thread_id ?? null },
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
  'find_channel',
  {
    title: 'Find Channel',
    description:
      'Find a channel by name and return its ID. Returns normalized channel data.',
    inputSchema: {
      channel_name: z.string().describe('Channel name to look up'),
    },
  },
  async ({ channel_name }) => {
    // TODO: delegate to upstream slack MCP server
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              provider: 'scaffold',
              channel_id: null,
              channel_name,
              is_private: null,
              member_count: null,
              query: { channel_name },
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
